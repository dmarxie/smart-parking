from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
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
class RegisterView(generics.CreateAPIView):
    """View for user registration."""
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserCreateSerializer

class UserDetailView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user details."""
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    """View for changing user password."""
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

class UserListView(generics.ListAPIView):
    """View for listing users (admin only)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']

# Parking Location Views
class ParkingLocationListView(generics.ListCreateAPIView):
    """View for listing and creating parking locations."""
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

class ParkingLocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating and deleting parking locations."""
    queryset = ParkingLocation.objects.all()
    serializer_class = ParkingLocationSerializer
    permission_classes = (IsAdminUser,)

# Parking Slot Views
class ParkingSlotListView(generics.ListCreateAPIView):
    """View for listing and creating parking slots."""
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

class ParkingSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating and deleting parking slots."""
    queryset = ParkingSlot.objects.all()
    serializer_class = ParkingSlotSerializer
    permission_classes = (IsAdminUser,)

# Reservation Views
class ReservationListView(generics.ListCreateAPIView):
    """View for listing and creating reservations."""
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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ReservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating and deleting reservations."""
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

class ReservationCancelView(generics.UpdateAPIView):
    """View for cancelling reservations."""
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
class DashboardStatsView(APIView):
    """View for getting dashboard statistics."""
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