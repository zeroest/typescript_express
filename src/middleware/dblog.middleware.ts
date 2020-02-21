import {Request, Response, NextFunction} from 'express';
import {Container} from 'typedi';
import LogErr from '../entity/log/log_error.entity';
// import LogErr from '../entity/log/log_error.entity';
// import HttpException from '../exceptions/HttpException';
import {SuccessResponse} from '../utils';
import Config from '../config';
import {LogErrQuery} from '../query';

import {getRepository} from 'typeorm';
import {Logger} from "winston";
import Mysql from 'mysql';

const dbLogMiddleware = async (nextData: SuccessResponse | Error, request: Request, response: Response, next: NextFunction) => {
    if (nextData instanceof Error) {
        next(nextData);
        return;
    }


    const logger: Logger = Container.get('logger');
    const mysql: Mysql = Container.get('mysql');
    const logErrQuery = new LogErrQuery();

    try {
        const recordSet = await mysql.exec(logErrQuery.create(),
                   [
                       response.statusCode,
                       Config.server,
                       1,
                       request.method,
                       request.path,
                       JSON.stringify(request.headers),
                       JSON.stringify(nextData.params),
                       JSON.stringify(request.query),
                       JSON.stringify(request.body),
                       JSON.stringify(nextData.resultData)
                   ]);
        // const newLog = logErrRepository.create
        // ({
        //      status_code: response.statusCode,
        //      server: 1,
        //      id: 1,
        //      method: request.method,
        //      path: request.path,
        //      header: JSON.stringify(request.headers),
        //      params: JSON.stringify(nextData.params),
        //      query: JSON.stringify(request.query),
        //      payload: JSON.stringify(request.body),
        //      response: JSON.stringify(nextData.resultData),
        //      reg_date: new Date(),
        //  });
        // await logErrRepository.save(newLog);
        logger.info(`[${response.statusCode}|${request.method}|${request.path}]${JSON.stringify(nextData.resultData)}`);

    } catch (e) {
        logger.error(e);
    }

};

export default dbLogMiddleware;
