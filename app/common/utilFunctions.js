const crypto = require("crypto");
const projectSchema = require("../models/project.model");
const multer = require('multer');


const algorithm = 'aes-256-gcm';

const validationErrorMessage = (e) => {
    let e_msg = "Validation errors: \n"
    Object.values(e.errors).forEach(error => {
        e_msg = e_msg + "\n" + error.message
    })
    return e_msg
}

const upload = multer(
    {
        storage: multer.memoryStorage(),
        limits: { fileSize: 500000000 },
    }
);
const privateSignEncrypt = async (source) => {
    const prog = await projectSchema.findOne({});
    if (!prog) {
        console.error("Project not found");
        return null;
    }
    const secretKey = prog.secret_key;
    const privKey = prog.priv_key;

    try {
        let key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
        let keyBuffer = Buffer.from(key, 'utf8');
        //const cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
        const encrypted = cipher.update(JSON.stringify(source));
        const finalBuffer = Buffer.concat([encrypted, cipher.final()]);
        const data = iv.toString('hex') + ':' + finalBuffer.toString('hex')
        // Sign the data and returned signature in buffer
        const sign = crypto.sign("SHA256", Buffer.from(data), privKey);
        // Convert returned buffer to base64
        const signature = sign.toString('hex');
        console.log(JSON.stringify({data, signature, key, keyBuffer}))
        return {data, signature}
    } catch (e) {
        console.error(e);
        return null;
    }
}

const publicSignDecrypt = async (source) => {

    const {data, signature} = source;
    const prog = await projectSchema.findOne();
    if (!prog) {
        console.error("Project not found");
        return null;
    }
    const secretKey = prog.secret_key;
    const loginPubKey = prog.remote_pub_key;
    try {
        //  if (!crypto.verify("SHA256", data, apiPubkey, Buffer.from(signature, "hex"))){
        if (!crypto.verify("SHA256", Buffer.from(data), loginPubKey, Buffer.from(signature, "hex"))) {
            console.error("Key verification failure");
            return null;
        }
        let key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
        let keyBuffer = Buffer.from(key, 'utf8');
        const encryptedArray = data.split(':');
        const iv = new Buffer(encryptedArray[0], 'hex');
        const encrypted = new Buffer(encryptedArray[1], 'hex');
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
        const decrypted = decipher.update(encrypted);
        return Buffer.concat([decrypted, decipher.final()]).toString();
    } catch
        (e) {
        console.error(e);
        return null;
    }
}

const stripQuotes = (str) => {
  return str.replace(/^"(.*)"$/, '$1');
}

module.exports = {
    privateSignEncrypt, publicSignDecrypt, validationErrorMessage, upload, stripQuotes
}
