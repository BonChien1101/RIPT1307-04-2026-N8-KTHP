const crypto = require('crypto');

// JWT HS256 (tối giản, không dùng thư viện ngoài)

const b64url = (input) => {
	return Buffer.from(input)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
};

const b64urlJson = (obj) => b64url(JSON.stringify(obj));

const sign = (data, secret) => {
	return crypto
		.createHmac('sha256', secret)
		.update(data)
		.digest('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
};

const parseExp = (expiresIn) => {
	// hỗ trợ: '1h', '7d', '30m' hoặc số (giây)
	if (typeof expiresIn === 'number') return expiresIn;
	const m = String(expiresIn).trim().match(/^(\d+)([smhd])$/i);
	if (!m) return 60 * 60;
	const n = Number(m[1]);
	const unit = m[2].toLowerCase();
	const mul = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
	return n * mul;
};

const signToken = (payload, { expiresIn = '7d' } = {}) => {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET is missing in environment');

	const header = { alg: 'HS256', typ: 'JWT' };
	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + parseExp(expiresIn);

	const fullPayload = { ...payload, iat, exp };
	const encodedHeader = b64urlJson(header);
	const encodedPayload = b64urlJson(fullPayload);
	const data = `${encodedHeader}.${encodedPayload}`;
	const signature = sign(data, secret);
	return `${data}.${signature}`;
};

const verifyToken = (token) => {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET is missing in environment');

	const parts = String(token || '').split('.');
	if (parts.length !== 3) throw new Error('Invalid token');
	const [encodedHeader, encodedPayload, signature] = parts;
	const data = `${encodedHeader}.${encodedPayload}`;
	const expected = sign(data, secret);
	if (expected !== signature) throw new Error('Invalid signature');

	const payloadJson = Buffer.from(
		encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
		'base64'
	).toString('utf8');
	const payload = JSON.parse(payloadJson);
	const now = Math.floor(Date.now() / 1000);
	if (payload.exp && now > payload.exp) throw new Error('Token expired');
	return payload;
};

module.exports = { signToken, verifyToken };
