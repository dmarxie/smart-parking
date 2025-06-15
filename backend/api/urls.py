from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

app_name = 'api'

urlpatterns = [
    # authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # user management endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('users/me/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/me/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    
    # parking location endpoints
    path('locations/', views.ParkingLocationListView.as_view(), name='location-list'),
    path('locations/<int:pk>/', views.ParkingLocationDetailView.as_view(), name='location-detail'),
    path('locations/<int:pk>/spots/', views.LocationParkingSlotsView.as_view(), name='location-spots'),
    
    # parking slot endpoints
    path('slots/', views.ParkingSlotListView.as_view(), name='slot-list'),
    path('slots/<int:pk>/', views.ParkingSlotDetailView.as_view(), name='slot-detail'),
    
    # reservation endpoints
    path('reservations/', views.ReservationListView.as_view(), name='reservation-list'),
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='reservation-detail'),
    path('reservations/<int:pk>/cancel/', views.ReservationCancelView.as_view(), name='reservation-cancel'),
    
    # dashboard endpoints (admin only)
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
] 