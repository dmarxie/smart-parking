from rest_framework import generics, permissions, status, filters, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from .models import ParkingLocation, ParkingSlot, Reservation
from .serializers import (
    # User serializers
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, ChangePasswordSerializer,
    # Location serializers
    ParkingLocationSerializer, ParkingLocationCreateSerializer,
    # Slot serializers
    ParkingSlotSerializer, ParkingSlotCreateSerializer,
    # Reservation serializers
    ReservationSerializer, ReservationCreateSerializer, ReservationUpdateSerializer
)
from .pagination import CustomPagination

User = get_user_model()

# Custom permissions
class IsAdminUser(permissions.BasePermission):
    """Allow only admin users to access the view."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_admin

class IsOwnerOrAdmin(permissions.BasePermission):
    """Allow users to access their own data or admin to access any data."""
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj.user == request.user

# User Views
@extend_schema(tags=['Authentication'])
class RegisterView(generics.CreateAPIView):
    """
    Register a new user.
    
    Creates a new user account with the provided email and password.
    The user will be assigned the USER role by default.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserCreateSerializer

@extend_schema(tags=['Users'])
class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Get or update the authenticated user's profile.
    
    - GET: Retrieve the current user's profile using UserSerializer
    - PUT/PATCH: Update the current user's profile using UserUpdateSerializer
        Allowed fields:
        - first_name
        - last_name
        - notification_preference
    """
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

@extend_schema(tags=['Users'])
class ChangePasswordView(generics.UpdateAPIView):
    """
    Change the authenticated user's password.
    
    Requires the current password and the new password.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {"old_password": ["Wrong password."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response(status=status.HTTP_200_OK)

@extend_schema(tags=['Users'])
class UserListView(generics.ListAPIView):
    """
    List all users (Admin only).
    
    Provides filtering, searching, and ordering capabilities:
    - Filter by: role, is_active
    - Search in: email, first_name, last_name
    - Order by: created_at, email
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']

# Parking Location Views
@extend_schema(tags=['Locations'])
class ParkingLocationListView(generics.ListCreateAPIView):
    """
    List all parking locations or create a new one.
    
    - GET: List all parking locations (public)
    - POST: Create a new parking location (admin only)
    
    Provides filtering and searching capabilities:
    - Filter by: is_active
    - Search in: name, address
    """
    queryset = ParkingLocation.objects.all()
    serializer_class = ParkingLocationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'address']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ParkingLocationCreateSerializer
        return ParkingLocationSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.AllowAny()]

@extend_schema(tags=['Locations'])
class ParkingLocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a parking location.
    
    - GET: Retrieve a specific parking location (authenticated users)
    - PUT/PATCH: Update a parking location (admin only)
    - DELETE: Delete a parking location (admin only)
    """
    queryset = ParkingLocation.objects.all()
    serializer_class = ParkingLocationSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

# Parking Slot Views
@extend_schema(tags=['Slots'])
class ParkingSlotListView(generics.ListCreateAPIView):
    """
    List all parking slots or create a new one.
    
    - GET: List all parking slots (public)
    - POST: Create a new parking slot (admin only)
    
    Provides filtering and searching capabilities:
    - Filter by: location, is_occupied, is_reserved
    - Search in: slot_number
    """
    queryset = ParkingSlot.objects.all()
    serializer_class = ParkingSlotSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['location', 'is_occupied', 'is_reserved']
    search_fields = ['slot_number']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ParkingSlotCreateSerializer
        return ParkingSlotSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.AllowAny()]

@extend_schema(tags=['Slots'])
class ParkingSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a parking slot (Admin only).
    
    - GET: Retrieve a specific parking slot
    - PUT/PATCH: Update a parking slot
    - DELETE: Delete a parking slot
    """
    queryset = ParkingSlot.objects.all()
    serializer_class = ParkingSlotSerializer
    permission_classes = (IsAdminUser,)

@extend_schema(tags=['Slots'])
class LocationParkingSlotsView(generics.ListAPIView):
    """
    List all parking slots for a specific location.
    
    - GET: List all parking slots for a location (public)
    """
    serializer_class = ParkingSlotSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = CustomPagination

    def get_queryset(self):
        location_id = self.kwargs.get('pk')
        return ParkingSlot.objects.filter(location_id=location_id)

# Reservation Views
@extend_schema(tags=['Reservations'])
class ReservationListView(generics.ListCreateAPIView):
    """
    List all reservations or create a new one.
    
    - GET: List reservations (filtered by user role)
        - Admins see all reservations
        - Users see only their reservations
    - POST: Create a new reservation
    
    Provides filtering, searching, and ordering capabilities:
    - Filter by: status, parking_slot__location
    - Search in: parking_slot__slot_number
    - Order by: start_time, end_time, created_at
    """
    serializer_class = ReservationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'parking_slot__location']
    search_fields = ['parking_slot__slot_number']
    ordering_fields = ['start_time', 'end_time', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Reservation.objects.all()
        return Reservation.objects.filter(user=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReservationCreateSerializer
        return ReservationSerializer

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except Exception as e:
            raise serializers.ValidationError(str(e))

@extend_schema(tags=['Reservations'])
class ReservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a reservation.
    
    - GET: Retrieve a specific reservation
    - PUT/PATCH: Update a reservation
        - Admins can update status
        - Users can only cancel their reservations
    - DELETE: Delete a reservation
    """
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = (IsOwnerOrAdmin,)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ReservationUpdateSerializer
        return ReservationSerializer

    def perform_update(self, serializer):
        if self.request.user.is_admin:
            serializer.save()
        else:
            # Regular users can only cancel their own reservations
            if serializer.validated_data.get('status') != 'CANCELLED':
                raise permissions.PermissionDenied(
                    "You can only cancel reservations."
                )
            serializer.save()

@extend_schema(tags=['Reservations'])
class ReservationCancelView(generics.UpdateAPIView):
    """
    Cancel a reservation.
    
    Cancels a reservation if it meets the cancellation criteria:
    - Reservation must be in PENDING or CONFIRMED status
    - Must be within the cancellation window (default: 1 hour before start time)
    """
    queryset = Reservation.objects.all()
    serializer_class = ReservationUpdateSerializer
    permission_classes = (IsOwnerOrAdmin,)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.can_be_cancelled:
            return Response(
                {"detail": "This reservation cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data={'status': 'CANCELLED'}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

# Dashboard Views (Admin only)
@extend_schema(tags=['Dashboard'])
class DashboardStatsView(APIView):
    """
    Get dashboard statistics (Admin only).
    
    Returns:
    - today_reservations: Number of reservations for today
    - active_reservations: Number of active (PENDING or CONFIRMED) reservations
    - total_slots: Total number of parking slots
    - occupied_slots: Number of currently occupied slots
    - available_slots: Number of currently available slots
    """
    permission_classes = (IsAdminUser,)

    def get(self, request):
        today = timezone.now().date()
        
        # Get total reservations for today
        today_reservations = Reservation.objects.filter(
            start_time__date=today
        ).count()
        
        # Get active reservations
        active_reservations = Reservation.objects.filter(
            status__in=['PENDING', 'CONFIRMED']
        ).count()
        
        # Get total available slots
        total_slots = ParkingSlot.objects.count()
        occupied_slots = ParkingSlot.objects.filter(
            is_occupied=True
        ).count()
        
        return Response({
            'today_reservations': today_reservations,
            'active_reservations': active_reservations,
            'total_slots': total_slots,
            'occupied_slots': occupied_slots,
            'available_slots': total_slots - occupied_slots
        }) 