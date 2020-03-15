import {Container, Service, Inject} from 'typedi';
import {extname, basename} from 'path';
import moment from 'moment';
import gm from 'gm';

import ConfigClass from '../../config/config.dto';

import FileHandlerClass from '../../utils/fileHandler.class';
import FileDAOClass from './file.dao';
import FileDtoClass/*, { ResponseInterface }*/ from './file.dto';

import Mysql from '../../loaders/MysqlTemplate';
import sql from 'mysql';


@Service('FileService')
export default class FileService {

    @Inject()
    private Config: ConfigClass;
    @Inject()
    private FileDAO: FileDAOClass;

    public allowImageExt = ['.jpg', '.jpeg', '.png', '.gif'];
    private FileHandler: FileHandlerClass;

    constructor() {
        this.FileHandler = new FileHandlerClass();
    };

    public uploadImageService = async (FileDto: FileDtoClass) => {
        if (FileDto.makeThumb == 1 && (FileDto.thumbWidth == 0 || FileDto.thumbHeight == 0)) {
            throw new Error('@Thumbnail Scale Error');
        }

        return new Promise(async (resolve, reject) => {

            let baseRoot: string = `${this.Config.basePath}${this.Config.uploadPath}`;
            let path: string = `/${FileDto.filePath}`;
            let fileName: string = '';
            const originName: string = FileDto.fileData.originalname;
            const ext: string = extname(originName);

            let returnObj: FileResponseClass = new FileResponseClass();

            if (!this.allowImageExt.includes(ext)) {
                throw new Error('@Ext Not Allowed');
            }

            if (FileDto.useDateFolder === 1) {
                path += `/${moment().format('YYYYMMDD')}`;
            }

            if (FileDto.useUniqueFileName === 1) {
                fileName = `${this.FileHandler.getUniqueName()}${ext}`;
            } else {
                fileName = originName;
            }

            const result = await this.FileHandler.uploadFileByBuffer(`${baseRoot}${path}`, fileName, FileDto.fileData.buffer);

            if (!result) {
                throw new Error('@File Upload Fail');
            }

            // @ts-ignore
            const originSize: {width: number, height: number} = await this.FileHandler.getDimension(FileDto.fileData.buffer);

            returnObj.userId = FileDto.userId;
            returnObj.fileName = fileName;
            returnObj.fileExtenstion = ext;
            returnObj.filePath = `${path}`;
            returnObj.fileWidth = originSize.height;
            returnObj.fileHeight = originSize.width;
            returnObj.fileSize = FileDto.fileData.size;
            returnObj.fileType = 'img';
            returnObj.option1 = FileDto.option1;
            returnObj.option2 = FileDto.option2;
            returnObj.option3 = FileDto.option3;
            returnObj.targetType = FileDto.targetType || 'TEMP';
            returnObj.targetKey = FileDto.targetKey || 'TEMP';

            const thumbName = `${basename(fileName, ext)}_thumb${ext}`;

            if(FileDto.makeThumb === 0 && FileDto.thumbData === undefined){
                returnObj.code = '01';

                await this.FileDAO.insertFile(returnObj);
                resolve(returnObj);


            } else if(FileDto.thumbData !== undefined){
                const result = await this.FileHandler.uploadFileByBuffer(`${baseRoot}${path}`, thumbName, FileDto.thumbData.buffer);

                if (!result) {
                    throw new Error('@File Upload Fail');
                }

                // @ts-ignore
                const thumbSize: {width: number, height: number} = await this.FileHandler.getDimension(FileDto.thumbData.buffer);

                returnObj.thumbName = thumbName;
                returnObj.thumbWidth = thumbSize.width;
                returnObj.thumbHeight = thumbSize.height;
                returnObj.code = '02';

                await this.FileDAO.insertFile(returnObj);
                resolve(returnObj);

            } else {
                // @ts-ignore
                const {resizeWidth, resizeHeight} = await this.FileHandler.rescaleCalc(originSize.width, originSize.height, FileDto.thumbWidth, FileDto.thumbHeight, FileDto.thumbOption);

                await this.FileHandler.getThumbnail(FileDto.fileData.buffer, resizeWidth, resizeHeight
                    , `${baseRoot}${path}/${thumbName}`, 100);

                // @ts-ignore
                const thumbSize: {width: number, height: number} = await this.FileHandler.getDimension(`${baseRoot}${path}/${thumbName}`);

                returnObj.thumbName = thumbName;
                returnObj.thumbWidth = thumbSize.width;
                returnObj.thumbHeight = thumbSize.height;
                returnObj.code = '03';

                await this.FileDAO.insertFile(returnObj);
                resolve(returnObj);

            }



        });

    }
;


}

export class FileResponseClass extends FileDtoClass{

    code: string;
    fileExtenstion: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileWidth: number;
    fileHeight: number;
    thumbName: string;
    thumbWidth: number;
    thumbHeight: number;

    public insertFile (){
        let query = `
            INSERT INTO 
                t_nf_file
            SET 
                target_type = ${sql.escape(this.targetType)}
                , target_key = ${sql.escape(this.targetKey)}
                , user_id = ${sql.escape(this.userId)}
                , file_type = ${sql.escape(this.fileType)}
                , file_path = ${sql.escape(this.filePath)}
                , file_name = ${sql.escape(this.fileName)}
                , file_extension = ${sql.escape(this.fileExtenstion)}
                , file_size = ${sql.escape(this.fileSize)}
                , file_width = ${sql.escape(this.fileWidth)}
                , file_height = ${sql.escape(this.fileHeight)}
                , thumb_path = ${sql.escape(this.filePath)}
                , thumb_name = ${sql.escape(this.thumbName)}
                , thumb_extension = ${sql.escape(this.fileExtenstion)}
                , thumb_width = ${sql.escape(this.thumbWidth)}
                , thumb_height = ${sql.escape(this.thumbHeight)}
                , option1 = ${sql.escape(this.option1)}
                , option2 = ${sql.escape(this.option2)}
                , option3 = ${sql.escape(this.option3)}
        `;

        return query;
    }

}
