const winston = require("winston");  //this is the logging object that behind the logger 
require('winston-daily-rotate-file')  //is a transport plugin for Winston that automatically rotates log files on a daily basis. without this the winston will write log in the same file without clearing it
const path = require("path"); 
const config = require("../config/config");


const logFormat = winston.format.combine(   
  winston.format.errors({ stack: true }), // when an error is logged, it includes the full stack trace instead of just the message
  winston.format.json()  // parsing every logs into json object
);

const infoTransport = new winston.transports.DailyRotateFile({  //handles info and top level logs
  filename: path.join(__dirname, '../logs/info-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
  format: logFormat
});

const errorTransport = new winston.transports.DailyRotateFile({  //handles error level logs only
  filename: path.join(__dirname, '../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: logFormat
});

const consoleTransport = new winston.transports.Console({  //consoles every logs
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

const logger = winston.createLogger({
  level: config.NODE_ENV  === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    infoTransport,
    errorTransport,
    ...(config.NODE_ENV !== 'production' ? [consoleTransport] : [])
  ]
});

module.exports = logger;