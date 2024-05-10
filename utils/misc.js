const crypto = require("crypto");

exports.calculateHash = (input) => {
  // Create a hash object using the SHA-256 algorithm
  const hash = crypto.createHash("sha256");

  // Update the hash object with the input string
  hash.update(input);

  // Generate the hash digest (binary format)
  const hashDigest = hash.digest();

  // Convert the hash digest to a hexadecimal string
  const hashHex = hashDigest.toString("hex");

  return hashHex;
};
