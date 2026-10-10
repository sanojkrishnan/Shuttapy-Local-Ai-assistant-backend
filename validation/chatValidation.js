const Joi = require("joi");

const messageSchema = Joi.object({
  role: Joi.string().valid("user", "assistant").required(),
  content: Joi.string().trim().min(1).max(20000).required(),
});

const chatSchema = Joi.object({
  messages: Joi.array().items(messageSchema).min(1).max(30).required(),
});

module.exports = { messageSchema, chatSchema };
