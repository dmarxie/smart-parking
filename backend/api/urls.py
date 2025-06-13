from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

app_name = 'api'

urlpatterns = [
    # Authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User management endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('users/me/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/me/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    
    # Parking location endpoints
    path('locations/', views.ParkingLocationListView.as_view(), name='location-list'),
    path('locations/<int:pk>/', views.ParkingLocationDetailView.as_view(), name='location-detail'),
    
    # Parking slot endpoints
    path('slots/', views.ParkingSlotListView.as_view(), name='slot-list'),
    path('slots/<int:pk>/', views.ParkingSlotDetailView.as_view(), name='slot-detail'),
    
    # Reservation endpoints
    path('reservations/', views.ReservationListView.as_view(), name='reservation-list'),
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='reservation-detail'),
    path('reservations/<int:pk>/cancel/', views.ReservationCancelView.as_view(), name='reservation-cancel'),
    
    # Dashboard endpoints (admin only)
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
] 