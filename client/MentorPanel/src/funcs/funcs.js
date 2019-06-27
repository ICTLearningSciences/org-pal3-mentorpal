
export const normalizeString = (str) => {
    return str.replace(/\W+/g, '').normalize().toLowerCase()
}

export const chromeVersion = () => {
    if (typeof navigator === `undefined`) {
        return false;
    }
    
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : false;
}
