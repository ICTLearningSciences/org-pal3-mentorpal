
export const normalizeString = (str) => {
    return str.replace(/\W+/g, '').normalize().toLowerCase()
}