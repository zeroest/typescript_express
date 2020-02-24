import {Inject} from 'typedi';

export default class contentsQuery{
    @Inject('mysql')
    private mysql

    constructor(){}

    public createNotice = () => {
        let query =
            `INSERT INTO t_nf_contents (serial_number, contents_type, contents, phone_number)
             VALUES (?, 'NOTICE', ?, 'ADMIN') `;

        return query;
    }

    public all = (page, keyword) => {
        let query =
            `SELECT *
            FROM t_nf_contents c
            WHERE status = 50
                ${keyword ? `AND(
                    phone_number LIKE '%${keyword}%'
                    OR contents LIKE '%${keyword}%'
                )` : ``}
            ORDER BY contents_seq DESC 
            LIMIT ${(page - 1) * 10}, 10 `;

        return query;
    }

    public getBySeqs = () => {
        let query =
            `SELECT *
            FROM t_nf_contents c
            WHERE c.contents_seq IN ( ? )
                AND status = 50 
            ORDER BY contents_seq DESC `;

        return query;
    }

    public imgFile = (contentsSeq) =>{
        let query = 
            `SELECT f.*
             FROM t_nf_file f WHERE f.target_type = 'CONTENTS'
                AND f.target_key = ${contentsSeq}`;
        
        return query;
    }

    public notice = () =>{
        let query =
            `SELECT *
            FROM t_nf_contents c
            WHERE c.contents_type = 'NOTICE'
            ORDER BY c.contents_seq DESC
            LIMIT 1 `;

        return query;
    }

    public updateFile = () =>{
        let query =
            `UPDATE t_nf_file  
            SET target_type = 'CONTENTS',
                target_key = ? 
            WHERE file_seq IN ( ? )`;

        return query;
    }

    public delete = () =>{
        let query =
            `UPDATE t_nf_contents
            SET status = 10
            WHERE contents_seq IN ( ? )`;

        return query;
    }
}