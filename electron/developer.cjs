const developer = require("./developer.json");

const contacts = Object.fromEntries([
  ["email", { text: developer.email, url: `mailto:${developer.email}` }],
  ["phone", { text: developer.phone }],
  ...developer.socials.map(({ id, url }) => [id, { text: url, url }]),
]);

// The renderer sends a contact ID, never a URL or clipboard contents.
function developerContact(id) {
  if (typeof id !== "string" || !Object.hasOwn(contacts, id))
    throw Error("Thông tin liên hệ không hợp lệ.");
  return contacts[id];
}

module.exports = { developerContact };
