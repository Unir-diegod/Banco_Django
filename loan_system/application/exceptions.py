class ApplicationError(Exception):
    pass


class NotFound(ApplicationError):
    pass


class Conflict(ApplicationError):
    pass


class Forbidden(ApplicationError):
    pass
