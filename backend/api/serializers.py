from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import ParkingLocation, ParkingSlot, Reservation
from django.utils import timezone

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model."""
    
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'first_name', 'last_name', 
                 'notification_preference', 'created_at')
        read_only_fields = ('id', 'role', 'created_at')

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new user."""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'first_name', 'last_name', 
                 'notification_preference')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'notification_preference')

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change endpoint."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

class ParkingLocationSerializer(serializers.ModelSerializer):
    """Serializer for parking locations."""
    
    available_slots = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ParkingLocation
        fields = ('id', 'name', 'address', 'total_slots', 'available_slots', 
                 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class ParkingLocationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating parking locations (admin only)."""
    
    class Meta:
        model = ParkingLocation
        fields = ('name', 'address', 'total_slots', 'is_active')

class ParkingSlotSerializer(serializers.ModelSerializer):
    """Serializer for parking slots."""
    
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = ParkingSlot
        fields = ('id', 'location', 'location_name', 'slot_number', 
                 'is_occupied', 'is_reserved', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class ParkingSlotCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating parking slots (admin only)."""
    
    class Meta:
        model = ParkingSlot
        fields = ('location', 'slot_number')

    def validate(self, attrs):
        location = attrs['location']
        slot_number = attrs['slot_number']
        
        # Check if slot number already exists for this location
        if ParkingSlot.objects.filter(location=location, slot_number=slot_number).exists():
            raise serializers.ValidationError(
                {"slot_number": "This slot number already exists for this location."}
            )
        return attrs

class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for reservations."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    location_name = serializers.CharField(source='parking_slot.location.name', read_only=True)
    slot_number = serializers.CharField(source='parking_slot.slot_number', read_only=True)
    can_be_cancelled = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Reservation
        fields = ('id', 'user', 'user_email', 'parking_slot', 'location_name', 
                 'slot_number', 'start_time', 'end_time', 'status', 
                 'can_be_cancelled', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def validate_status(self, value):
        """Validate status changes."""
        instance = getattr(self, 'instance', None)
        if instance and instance.status == 'COMPLETED':
            raise serializers.ValidationError(
                "Cannot change status of a completed reservation."
            )
        return value

class ReservationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reservations."""
    
    class Meta:
        model = Reservation
        fields = ('parking_slot', 'start_time', 'end_time')

    def validate(self, attrs):
        try:
            start_time = attrs['start_time']
            end_time = attrs['end_time']
            parking_slot = attrs['parking_slot']
            
            # Validate time range
            if start_time >= end_time:
                raise serializers.ValidationError(
                    {"end_time": "End time must be after start time."}
                )
            
            # Validate that start time is in the future
            if start_time <= timezone.now():
                raise serializers.ValidationError(
                    {"start_time": "Start time must be in the future."}
                )
            
            # Check if slot exists and is available
            try:
                slot = ParkingSlot.objects.get(id=parking_slot.id)
                if slot.is_occupied or slot.is_reserved:
                    raise serializers.ValidationError(
                        {"parking_slot": "This slot is currently occupied or reserved."}
                    )
            except ParkingSlot.DoesNotExist:
                raise serializers.ValidationError(
                    {"parking_slot": "Invalid parking slot."}
                )
            
            # Check if slot is available for the time range
            if Reservation.objects.filter(
                parking_slot=parking_slot,
                status__in=['PENDING', 'CONFIRMED'],
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
        parking_slot = validated_data['parking_slot']
        
        reservation = Reservation.objects.create(
            **validated_data
        )
        
        parking_slot.is_reserved = True
        parking_slot.save()
        
        return reservation

class ReservationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating reservations (admin only)."""
    
    class Meta:
        model = Reservation
        fields = ('status',)

    def validate_status(self, value):
        """Validate status changes."""
        instance = getattr(self, 'instance', None)
        if instance and instance.status == 'COMPLETED':
            raise serializers.ValidationError(
                "Cannot change status of a completed reservation."
            )
        return value 