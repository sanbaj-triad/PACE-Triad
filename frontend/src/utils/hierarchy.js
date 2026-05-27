/**
 * hierarchy.js - Utility functions for resolving management layers natively
 */

/**
 * Recursively resolves and returns all user objects that sit structurally underneath a given manager ID.
 * @param {Array} allUsers - The full array of system user objects
 * @param {number|string} rootManagerId - The ID of the manager at the top of the requested vertical
 * @returns {Array} An array of user objects within the nested team vertical
 */
export const getNestedTeam = (allUsers, rootManagerId) => {
    if (!allUsers || !rootManagerId) return [];
    
    let nestedTeam = [];
    let currentLevelIds = [Number(rootManagerId)];

    while (currentLevelIds.length > 0) {
        // Collect users whose direct manager is in our current cascading tier
        const nextLevelUsers = allUsers.filter(u => currentLevelIds.includes(u.manager_id));
        
        if (nextLevelUsers.length === 0) break;
        
        // Push the resolved users into the master output and extract their IDs for the next depth evaluation
        nestedTeam = [...nestedTeam, ...nextLevelUsers];
        currentLevelIds = nextLevelUsers.map(u => u.id);
    }

    return nestedTeam;
};

/**
 * Recursively resolves and returns purely the user IDs that sit structurally underneath a given manager ID.
 * Highly useful for strict array filtering against assignment arrays.
 * @param {Array} allUsers - The full array of system user objects
 * @param {number|string} rootManagerId - The ID of the manager at the top of the requested vertical
 * @returns {Array<number>} An array of numeric user IDs within the nested team vertical
 */
export const getNestedTeamIds = (allUsers, rootManagerId) => {
    return getNestedTeam(allUsers, rootManagerId).map(u => u.id);
};
