import {randomBytes} from "crypto";
import argon2 from "argon2";
import {Inject, Service} from 'typedi';
import mysql from 'mysql';
import MysqlTemplate from '../../utils/database/MysqlTemplate';

import ErrorResponse from '../../utils/response/ErrorResponse';

import UtilsClass from '../../utils/Utils';
import SignupDtoClass from './dto/signup.dto';

@Service('AuthDAO')
export default class AuthDAO{

    @Inject('utils')
    private Utils: UtilsClass;
    @Inject('mysql')
    private Mysql: MysqlTemplate;

    constructor(){}

    public async getUserLoginById (loginId: string, statusCheck?: boolean): Promise<any> {
        try {
            let query = `
            SELECT *
            FROM t_nf_user_login l
            WHERE l.login_id = ?
            `;

            if (statusCheck) {
                query = `
                SELECT l.*
                FROM (${query}) l
                INNER JOIN t_nf_user u ON u.user_id = l.user_id
                    AND u.user_status = 50
            `
            }

            const recordSet = await this.Mysql.query(query, [loginId]);

            return recordSet[0];

        }catch (e) {
            console.log(e);
            throw e;
        }
    }

    public async getUserByUserId (userId: number): Promise<any> {

        let query =`
            SELECT 
                CONVERT(u.uuid, CHAR(50)) AS uuid
                , u.nick_name
                , u.user_type
                , u.user_status
                , u.reg_date
                , u.agree_use
                , u.agree_use_date
                , u.agree_personal_info
                , u.agree_personal_info_date
                , CONCAT(f.file_path, f.file_name) AS file_path
                , CONCAT(f.thumb_path, f.thumb_name) AS thumb_path
            FROM (
                SELECT *
                FROM t_nf_user u
                WHERE u.user_id = ?
                ) u
            LEFT JOIN t_nf_file f ON f.target_type = 'USER'
                AND f.target_key = u.uuid
            `;

        const recordSet = await this.Mysql.query(query, [userId]);

        return recordSet[0];

    }

    public async getUserByUuid (uuid: string): Promise<any> {

        let query =`
            SELECT *
            FROM t_nf_user u
            WHERE u.uuid = ?
            `;

        const recordSet = await this.Mysql.query(query, [uuid]);

        return recordSet[0];

    }

    public async getSessionBySessionId (sessionId: string): Promise<any> {

        let query =`
            SELECT us.*, (us.push_set + 0) AS push_num
            FROM t_nf_user_session us
            WHERE us.session_id = ?
            `;

        const recordSet = await this.Mysql.query(query, [sessionId]);

        return recordSet[0];

    }

    public async getSessionByLoginGroup (userId: string, loginGroup: string): Promise<any> {

        let query =`
            SELECT us.*, (us.push_set + 0) AS push_num
            FROM t_nf_user_session us
            WHERE us.user_id = ?
                AND us.login_group = ?
            `;

        const recordSet = await this.Mysql.query(query, [userId, loginGroup]);

        return recordSet[0];

    }

    public async deleteSessionByUserIdAndLoginGroup (userId: string, loginGroup: string): Promise<any> {

        let query =`
            DELETE FROM t_nf_user_session
            WHERE user_id = ?
                AND login_group = ?
            `;

        const recordSet = await this.Mysql.query(query, [userId, loginGroup]);

        return recordSet;

    }

    public async deleteSessionBySessionId (sessionId: string, conn?: mysql.Connection): Promise<any> {

        let query =`
            DELETE FROM t_nf_user_session
            WHERE session_id = ?
            `;

        if(conn){
            conn.query(query, (err, result)=>{
                if(err){
                    throw err;
                    return;
                }

                return result;
            })
        }else{
            const recordSet = await this.Mysql.query(query, [sessionId]);

            return recordSet;

        }

    }

    public async insertSession (sessionId: string, userId: string, osType: string, osVersion: string, appVersion: string, pushKey: string): Promise<any> {

        let query =`
            INSERT IGNORE INTO t_nf_user_session
            SET session_id = ?
                , user_id = ?
                , login_group = ?
                , os_type = ?
                , os_version = ?
                , app_version = ?
                , push_key = ?
            `;

        const recordSet = await this.Mysql.query(query, [sessionId, userId, (osType === 'AOD' || osType === 'IOS' ? 'MOBILE' : (osType === 'WEB' ? 'WEB' : 'ETC')), osType, osVersion, appVersion, pushKey]);

        return recordSet;

    }

    public async updateLastLoginDate (sessionId: string, pushKey: string, userId: string): Promise<any> {

        let updateSession =`
            UPDATE t_nf_user_session
            SET push_key = ?
                , last_date = NOW()
                , refresh_date = NOW()
            WHERE session_id = ?
            `;

        const updateSessionResult = await this.Mysql.query(updateSession, [pushKey, sessionId]);

        let updateLogin = `
            UPDATE t_nf_user_login ul
            SET last_date = NOW()
            WHERE user_id = ?
        `;

        const updateLoginResult = await this.Mysql.query(updateLogin, [userId]);


        return {updateSessionResult, updateLoginResult};

    }

    public async signupUser (SignupDto: SignupDtoClass/*joinType: string, nickName: string, loginId: string, password: string, agreeUse: number, agreePersonalInfo: number*/): Promise<{uuid: any, userId: number}> {

        let hashedPassword: string | null;

        if(SignupDto.joinType !== 'NORMAL'){
            hashedPassword = null;

        }else{
            const salt = randomBytes(32);
            hashedPassword = await argon2.hash(SignupDto.password, { salt });

        }

        const uuid = UtilsClass.makeUserId();
        let userId: number;

        const [conn, querySync] = await this.Mysql.getConn();

        try{

            let insertUser =`
                INSERT t_nf_user
                SET uuid = ?
                    , user_type = 'USER'
                    , agree_use = ?
                    , agree_use_date = ${SignupDto.agreeUse === 1 ? `NOW()` : `NULL`} 
                    , agree_personal_info = ?
                    , agree_personal_info_date = ${SignupDto.agreePersonalInfo === 1 ? `NOW()` : `NULL`} 
            `;
                    // , nick_name = ?

            const insertUserResult = await querySync(insertUser, [uuid/*, SignupDto.nickName*/, SignupDto.agreeUse, SignupDto.agreePersonalInfo]);
            if(insertUserResult.affectedRows === 0){
                conn.rollback();
                throw new Error('[Error] Insert User');
            }

            userId = insertUserResult.insertId;

            let insertUserLogin = `
                INSERT t_nf_user_login
                SET ?
            `;

            const insertLoginResult = await querySync(insertUserLogin,
                {join_type: SignupDto.joinType, login_id: SignupDto.loginId, uuid, user_id: insertUserResult.insertId, password: hashedPassword}
            );
            if(insertLoginResult.affectedRows === 0){
                conn.rollback();
                throw new Error('[Error] Insert UserLogin');
            }

            // const updateFileResult = await querySync(`
            //     UPDATE t_nf_file
            //     SET target_type = 'USER'
            //         , target_key = ?
            //     WHERE file_seq = ?
            // `, [uuid, SignupDto.fileSeq]);
            //
            // if(updateFileResult.affectedRows === 0){
            //     conn.rollback;
            //     throw new Error('[Error] Update File Temp');
            // }

            await conn.commit();

        }catch(e){
            console.log(e)
            await conn.rollback();
            throw new ErrorResponse(500, e.message, '500');
        }finally{
            await conn.release();
        }

        return {uuid, userId};

    }

}
