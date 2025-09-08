/**
 * Generates a universally unique identifier (UUID) using a method that is
 * compatible with all browsers and works in insecure contexts (HTTP).
 * @returns {string} A UUID string.
 */
export function generateUUID() {
    // This uses the browser's crypto.getRandomValues, which is secure and widely supported.
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
