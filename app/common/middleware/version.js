const lowerVersion = (v1, v2) => {
    const v1s = v1.split('.');
    const v2s = v2.split('.');
    for (let i = 0; i < v1s.length; i++) {
        if (v1s[i] < v2s[i]) {
            return true;
        }
        if (v1s[i] > v2s[i]) {
            return false;
        } // if equal, check the next number
    }
    return false;
}
const version = async function (req, res, next) {
    let vers
    try {
        vers = (req.headers["X-Version"]).split(' ');
    } catch (e) {
        console.error("auth.version: ", e)
        return false;
    }
    if (!vers.length || vers.length < 2) return res.status(426).send("Upgrade Required");
    const type = vers[0];
    const version = vers[1];

//    if (!versions[type] || lowerVersion(version, versions[type])) {
//        return res.status(426).send("Upgrade Required");
//    }
    next();
};

module.exports = {version}
