from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles: set[str] = set()

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        role = getattr(user, "role", None)
        return role in self.allowed_roles


class AdminOrAnalyst(HasRole):
    allowed_roles = {"ADMIN", "ANALYST"}


class AnyAuthenticated(HasRole):
    allowed_roles = {"ADMIN", "ANALYST", "CLIENT"}
