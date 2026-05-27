// Role-Based Access Control configuration

// Keeping for fallback or legacy usages if any, but backend now uses user.has_financial_access
export const FINANCIAL_ROLES = ['admin', 'project manager', 'finance'];

/**
 * Check if a given user has access to financial routes and UI elements.
 * @param {Object} user - The authenticated user object from AuthContext
 * @returns {Boolean} true if the user's role grants financial access
 */
export const hasFinancialAccess = (user) => {
    if (!user) return false;
    
    // Explicit attribute-based access control
    if (user.has_financial_access === true) return true;
    
    // Fallback for admins just in case the migration missed someone
    if (user.role && user.role.toLowerCase().trim() === 'admin') return true;
    
    return false;
};
