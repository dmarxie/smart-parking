from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

class UserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    """Custom user model."""
    
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        USER = 'USER', _('User')

    class NotificationPreference(models.TextChoices):
        ALL = 'ALL', _('All Notifications')
        IMPORTANT = 'IMPORTANT', _('Important Only')
        NONE = 'NONE', _('No Notifications')

    username = None
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
    )
    notification_preference = models.CharField(
        max_length=10,
        choices=NotificationPreference.choices,
        default=NotificationPreference.ALL,
        help_text=_('Email notification preferences')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    def should_receive_notification(self, notification_type):
        """
        Check if user should receive a specific type of notification.
        notification_type can be: 'reservation_confirmation', 'reservation_expiry',
        'reservation_cancellation', 'reservation_reminder'
        """
        if self.notification_preference == self.NotificationPreference.NONE:
            return False
        if self.notification_preference == self.NotificationPreference.IMPORTANT:
            # Only send important notifications
            return notification_type in ['reservation_cancellation', 'reservation_expiry']
        return True  # NotificationPreference.ALL

class ParkingLocation(models.Model):
    """Model for parking locations."""
    
    name = models.CharField(max_length=100)
    address = models.TextField()
    total_slots = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def available_slots(self):
        """Calculate available slots."""
        return self.total_slots - self.parkingslot_set.filter(is_occupied=True).count()

class ParkingSlot(models.Model):
    """Model for individual parking slots."""
    
    location = models.ForeignKey(ParkingLocation, on_delete=models.CASCADE)
    slot_number = models.CharField(max_length=10)
    is_occupied = models.BooleanField(default=False)
    is_reserved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('location', 'slot_number')

    def __str__(self):
        return f"{self.location.name} - Slot {self.slot_number}"

class Reservation(models.Model):
    """Model for parking reservations."""
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        CONFIRMED = 'CONFIRMED', _('Confirmed')
        CANCELLED = 'CANCELLED', _('Cancelled')
        COMPLETED = 'COMPLETED', _('Completed')
        EXPIRED = 'EXPIRED', _('Expired')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parking_slot = models.ForeignKey(ParkingSlot, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reservation {self.id} - {self.user.email}"

    def save(self, *args, **kwargs):
        """Override save to handle reservation status."""
        if self.status == self.Status.PENDING:
            # Check if reservation is expired
            expiry_time = self.created_at + timedelta(minutes=settings.RESERVATION_EXPIRY_MINUTES)
            if timezone.now() > expiry_time:
                self.status = self.Status.EXPIRED
        elif self.status == self.Status.CONFIRMED:
            # Check if reservation is completed
            if timezone.now() > self.end_time:
                self.status = self.Status.COMPLETED
        super().save(*args, **kwargs)

    @property
    def can_be_cancelled(self):
        """Check if reservation can be cancelled."""
        if self.status not in [self.Status.PENDING, self.Status.CONFIRMED]:
            return False
        cancellation_deadline = self.start_time - timedelta(hours=settings.RESERVATION_CANCELLATION_WINDOW_HOURS)
        return timezone.now() < cancellation_deadline 