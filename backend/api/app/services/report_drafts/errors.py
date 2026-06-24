UNCLASSIFIABLE_REPORT_CODE = "unclassifiable_report"


class ReportDraftFailure(Exception):
    pass


class ReportDraftRejection(Exception):
    def __init__(
        self,
        reason: str,
        code: str = UNCLASSIFIABLE_REPORT_CODE,
    ):
        self.code = code
        self.reason = reason
        super().__init__(reason)
