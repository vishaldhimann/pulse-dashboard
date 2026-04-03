/**
 * Lending Plugin — domain-specific tracking for lending/fintech platforms
 * Adds: trackLoan, trackStatusChange, trackServiceCall helpers
 */
const LendingPlugin = {
  name: 'lending',

  setup(pulse) {
    // Register custom event types
    pulse.registerEventType('loan_application', {
      requiredFields: ['loanType', 'amount']
    });
    pulse.registerEventType('status_change', {
      requiredFields: ['fromStatus', 'toStatus']
    });

    // Add convenience methods to the pulse instance
    pulse.trackLoan = function (loanType, amount, status, metadata = {}) {
      return this.track('loan_application', {
        ...metadata,
        _type: 'loan_event',
        loanType,
        requestedAmount: amount,
        appStatus: status
      });
    };

    pulse.trackStatusChange = function (applicationId, fromStatus, toStatus, metadata = {}) {
      return this.track('status_change', {
        ...metadata,
        _type: 'status_change',
        applicationId,
        fromStatus,
        toStatus
      });
    };

    pulse.trackApproval = function (applicationId, approvedAmount, metadata = {}) {
      return this.track('loan_approved', {
        ...metadata,
        _type: 'loan_event',
        applicationId,
        approvedAmount,
        appStatus: 'approved'
      });
    };

    pulse.trackDecline = function (applicationId, reason, metadata = {}) {
      return this.track('loan_declined', {
        ...metadata,
        _type: 'loan_event',
        applicationId,
        declineReason: reason,
        appStatus: 'declined'
      });
    };
  }
};

module.exports = LendingPlugin;
