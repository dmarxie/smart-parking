from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.db import models
from .models import ParkingLocation, ParkingSlot, Reservation

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Base serializer for User model.
    Used for listing and retrieving user information.
    """

    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'first_name', 'last_name', 
                 'notification_preference', 'created_at')
        read_only_fields = ('id', 'role', 'created_at')

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles password validation and confirmation.
    """
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'first_name', 'last_name', 
                 'notification_preference')

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """Create a new user with validated data."""
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information.
    Excludes sensitive fields like password and role.
    """
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'notification_preference')

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change operations.
    Validates old password and new password confirmation.
    """
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class ParkingLocationSerializer(serializers.ModelSerializer):
    """
    Base serializer for ParkingLocation model.
    Includes computed available_slots field based on actual reservation status.
    """
    
    available_slots = serializers.SerializerMethodField()
    
    class Meta:
        model = ParkingLocation
        fields = ('id', 'name', 'address', 'total_slots', 'available_slots', 
                 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_available_slots(self, obj):
        """
        Calculate available slots based on actual reservation status.
        """
        now = timezone.now()
        total_slots = obj.parkingslot_set.count()
        
        # count slots that are either occupied or have active confirmed reservations
        unavailable_slots = obj.parkingslot_set.filter(
            models.Q(is_occupied=True) |
            models.Q(
                reservation__status='CONFIRMED',
                reservation__start_time__lte=now,
                reservation__end_time__gte=now
            )
        ).distinct().count()
        
        return total_slots - unavailable_slots

class ParkingLocationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new parking locations (Admin only).
    """
    
    class Meta:
        model = ParkingLocation
        fields = ('name', 'address', 'total_slots', 'is_active')


class ParkingSlotSerializer(serializers.ModelSerializer):
    """
    Base serializer for ParkingSlot model.
    Includes location name and current reservation information.
    """
    
    location_name = serializers.CharField(source='location.name', read_only=True)
    current_reservation = serializers.SerializerMethodField()
    
    class Meta:
        model = ParkingSlot
        fields = ('id', 'location', 'location_name', 'slot_number', 
                 'is_occupied', 'is_reserved', 'current_reservation', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_current_reservation(self, obj):
        """
        Get the current reservation for this slot (PENDING or CONFIRMED).
        Returns status, start_time, end_time, and user id.
        """
        now = timezone.now()
        reservation = Reservation.objects.filter(
            parking_slot=obj,
            end_time__gte=now,
            status__in=['PENDING', 'CONFIRMED']
        ).order_by('start_time').first()
        if reservation:
            return {
                'id': reservation.id,
                'status': reservation.status,
                'start_time': reservation.start_time,
                'end_time': reservation.end_time,
                'user': reservation.user.id
            }
        return None

class ParkingSlotCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new parking slots.
    Validates slot number uniqueness within location.
    """
    
    class Meta:
        model = ParkingSlot
        fields = ('location', 'slot_number')

    def validate(self, attrs):
        """
        Validate slot number uniqueness within location.
        """
        location = attrs['location']
        slot_number = attrs['slot_number']
        
        if ParkingSlot.objects.filter(location=location, slot_number=slot_number).exists():
            raise serializers.ValidationError(
                {"slot_number": "This slot number already exists for this location."}
            )
        return attrs


class ReservationSerializer(serializers.ModelSerializer):
    """
    Base serializer for Reservation model.
    Includes computed fields and related model information.
    """
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    location_name = serializers.CharField(source='parking_slot.location.name', read_only=True)
    slot_number = serializers.CharField(source='parking_slot.slot_number', read_only=True)
    can_be_cancelled = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Reservation
        fields = ('id', 'user', 'user_email', 'parking_slot', 'location_name', 
                 'slot_number', 'start_time', 'end_time', 'vehicle_plate', 'status', 
                 'can_be_cancelled', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def validate_status(self, value):
        """
        Validate status changes.
        Prevents modification of completed reservations.
        """
        instance = getattr(self, 'instance', None)
        if instance and instance.status == 'COMPLETED':
            raise serializers.ValidationError(
                "Cannot change status of a completed reservation."
            )
        return value

class ReservationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new reservations.
    Handles validation of time slots and availability.
    """
    
    class Meta:
        model = Reservation
        fields = ('parking_slot', 'start_time', 'end_time', 'vehicle_plate')

    def validate(self, attrs):
        """
        Validate reservation creation parameters.
        Checks time validity, slot availability, and conflicts.
        """
        try:
            start_time = attrs['start_time']
            end_time = attrs['end_time']
            parking_slot = attrs['parking_slot']
            
            # validate time range
            if start_time >= end_time:
                raise serializers.ValidationError(
                    {"end_time": "End time must be after start time."}
                )
            
            # validate that start time is in the future
            if start_time <= timezone.now():
                raise serializers.ValidationError(
                    {"start_time": "Start time must be in the future."}
                )
            
            # check if slot exists and is available
            try:
                slot = ParkingSlot.objects.get(id=parking_slot.id)
                if slot.is_occupied:
                    raise serializers.ValidationError(
                        {"parking_slot": "This slot is currently occupied."}
                    )
            except ParkingSlot.DoesNotExist:
                raise serializers.ValidationError(
                    {"parking_slot": "Invalid parking slot."}
                )
            
            # check for conflicting CONFIRMED reservations
            if Reservation.objects.filter(
                parking_slot=parking_slot,
                status='CONFIRMED',
                start_time__lt=end_time,
                end_time__gt=start_time
            ).exists():
                raise serializers.ValidationError(
                    {"parking_slot": "This slot is already reserved for the selected time period."}
                )
            
            return attrs
        except Exception as e:
            raise serializers.ValidationError(str(e))

    def create(self, validated_data):
        """
        Create a new reservation and update slot status.
        """
        parking_slot = validated_data['parking_slot']
        
        reservation = Reservation.objects.create(
            **validated_data
        )
        
        parking_slot.is_reserved = True
        parking_slot.save()
        
        return reservation

class ReservationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating reservation status (Admin only).
    """
    
    class Meta:
        model = Reservation
        fields = ('status',)

    def validate_status(self, value):
        instance = getattr(self, 'instance', None)
        if instance and instance.status == 'COMPLETED':
            raise serializers.ValidationError(
                "Cannot change status of a completed reservation."
            )
        return value

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get('status', instance.status)
        instance.status = new_status
        instance.save()

        slot = instance.parking_slot
        now = timezone.now()
        confirmed_res = Reservation.objects.filter(
            parking_slot=slot,
            status='CONFIRMED',
            end_time__gte=now
        ).order_by('start_time').first()
        if confirmed_res:
            if now < confirmed_res.start_time:
                slot.is_reserved = False
                slot.is_occupied = False
            elif confirmed_res.start_time <= now <= confirmed_res.end_time:
                slot.is_reserved = True
                slot.is_occupied = True
            else:
                slot.is_reserved = False
                slot.is_occupied = False
        else:
            pending_res = Reservation.objects.filter(
                parking_slot=slot,
                status='PENDING',
                end_time__gte=now
            ).order_by('start_time').first()
            if pending_res:
                slot.is_reserved = False
                slot.is_occupied = False
            else:
                slot.is_reserved = False
                slot.is_occupied = False
        slot.save()
        return instance 