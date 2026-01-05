from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AnalyticsDashboardView,
    AuthTokenObtainPairView,
    ClientsListView,
    LoanCreateView,
    LoanDecisionView,
    LoanQuoteView,
    RegisterPaymentView,
)


urlpatterns = [
    path("auth/token/", AuthTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("analytics/dashboard/", AnalyticsDashboardView.as_view(), name="analytics_dashboard"),
    path("clients/", ClientsListView.as_view(), name="clients_list"),
    path("loans/quote/", LoanQuoteView.as_view(), name="loan_quote"),
    path("loans/", LoanCreateView.as_view(), name="loan_create"),
    path("loans/<uuid:loan_id>/decision/", LoanDecisionView.as_view(), name="loan_decision"),
    path("payments/", RegisterPaymentView.as_view(), name="payment_register"),
]
