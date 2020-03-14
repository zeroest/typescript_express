import {Container} from 'typedi';
import { createLogger, format, transports } from 'winston';
import ConfigClass from '../config/config.dto';

const Config: ConfigClass = Container.get('Config');

const { combine, timestamp, label, printf, prettyPrint } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;    // log 출력 포맷 정의
});

function makeOption(serviceName = '', server: string = ''){
  if(server === ''){
    throw new Error('server is empty');
  }if(serviceName === ''){
    throw new Error('serviceName is empty');
  }

  return {
    // log파일
    file: {
      level: 'info',
      filename: `${__dirname}/../../logs/${Config.serviceName}_${server}.log`, // 로그파일을 남길 경로
      handleExceptions: true,
      json: false,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false,
      format: combine(
          label({ label: `${Config.serviceName}` }),
          timestamp(),
          myFormat,    // log 출력 포맷
      ),
    },
    // 개발 시 console에 출력
    console: {
      level: 'debug',
      handleExceptions: true,
      json: false, // 로그형태를 json으로도 뽑을 수 있다.
      colorize: true,
      format: combine(
          label({ label: `${Config.serviceName}_${server}` }),
          timestamp(),
          myFormat,
          // prettyPrint()
      ),
    },
  }
}

// const options = {
//   // log파일
//   file: {
//     level: 'info',
//     filename: `${__dirname}/../../logs/${config.serviceName}_was.log`, // 로그파일을 남길 경로
//     handleExceptions: true,
//     json: false,
//     maxsize: 5242880, // 5MB
//     maxFiles: 5,
//     colorize: false,
//     format: combine(
//       label({ label: `${config.serviceName}` }),
//       timestamp(),
//       myFormat,    // log 출력 포맷
//     ),
//   },
//   // 개발 시 console에 출력
//   console: {
//     level: 'debug',
//     handleExceptions: true,
//     json: false, // 로그형태를 json으로도 뽑을 수 있다.
//     colorize: true,
//     format: combine(
//       label({ label: `${config.serviceName}_DEBUG` }),
//       timestamp(),
//       myFormat,
//       // prettyPrint()
//     ),
//   },
// };

let options = makeOption(Config.serviceName, Config.server);

const loggerInstance = createLogger({
  transports: [
    new transports.File(options.file), // 중요! 위에서 선언한 option으로 로그 파일 관리 모듈 transport
  ],
  exitOnError: false,
});

if (Config.nodeEnv !== 'production') {
  loggerInstance.add(new transports.Console(options.console)); // 개발 시 console로도 출력
}

export default loggerInstance;
