import argon2 from 'argon2';
import {createHash} from 'crypto';
import {Request} from 'express';
import moment = require('moment');
import redis, {RedisClient, print} from 'redis';
import {Container, Service, Inject} from 'typedi';
import {promisify} from 'util';
import TokenInterface from '../../interfaces/token.interface';

import UtilsClass from '../../utils/Utils';

import ConfigClass from '../../config/config.dto';
import HabitListDto from './dto/habitList.dto';
import HabitDAOClass from './habit.dao';
import HabitDtoClass from './dto/makeHabit.dto';

import ErrorResponse from "../../utils/response/ErrorResponse";

@Service()
export default class HabitService {

    @Inject()
    private Config: ConfigClass;
    @Inject()
    private HabitDAO: HabitDAOClass;
    // @Inject('redis')
    // private Redis: RedisClient;

    constructor() {};

    public makeRoomService = async (HabitDto: HabitDtoClass, token: TokenInterface): Promise<any> => {
        console.log('makeRoomService')
        try {

            /** Start,End Date Valid Check **/
            if (!HabitDto.validDate()) {
                throw new ErrorResponse(400, 'Invalid date period', '01');
                return;
            }

            /** Category Valid Check **/
            const categoryData = await this.HabitDAO.categoryValidCheck(HabitDto.habitCategory);
            if (!categoryData) {
                throw new ErrorResponse(400, 'Invalid categorySeq', '02');
                return;
            }

            /** Insert Room **/
            return await this.HabitDAO.insertRoom(HabitDto, token);

        }catch (e) {
            // console.log(e)
            throw e;
        }

    };

    public roomListService = async (token: TokenInterface, HabitListDto: HabitListDto): Promise<any> => {

        /** Get Room **/
        let [habitList, count] = await this.HabitDAO.getRoomList(token, HabitListDto);

        return [habitList, count];

    };

    public roomDetailService = async (habitSeq: number, token: TokenInterface): Promise<any> => {
        try {

            /** Get Room **/
            let roomData, getJoin;
            {
                [roomData, getJoin] = await this.HabitDAO.getRoomBySeq(habitSeq, token);
                if (!roomData) {
                    throw new ErrorResponse(404, 'Not Exist habitSeq', '01');
                    return;
                }
            }

            /** Room Status Check **/
            {
                if (roomData.habit_status === 10) {
                    throw new ErrorResponse(400, 'Deleted Room', '02');
                    return;
                }
                if (roomData.habit_status === 20 /*&& (moment(roomData.mod_date).add(1, 'day') < moment())*/) {
                    throw new ErrorResponse(400, 'Rejected Room', '03');
                    return;
                }
                // if( roomData.habit_status === 30 && (moment(roomData.start_date).add(1, 'day') < moment()) ){
                //     throw new ErrorResponse(401, 'Pending Rejected Room', '03');
                //     return;
                // }
            }

            /** Valid Access Check **/
            {
                if (moment(roomData.start_date) < moment()) {
                    if (roomData.habit_status != 50) {
                        throw new ErrorResponse(400, 'Pending Rejected Room', '04');
                        return;
                    }

                    if (!getJoin) {
                        throw new ErrorResponse(401, 'Not Join This Room', '05');
                        return;
                    }

                    if (getJoin) {
                        if (getJoin.join_status !== 100) {
                            let message: string = 'Invalid Access';
                            if (getJoin.join_status === 70) {
                                message = 'Withdraw User'
                            } else if (getJoin.join_status === 30) {
                                message = 'Rejected User'
                            }
                            throw new ErrorResponse(401, message, '06');
                            return;
                        }
                    }

                }
            }

            return [roomData, getJoin];

        }catch (e) {
            console.log(e);
            throw e;
        }
    };

    public updateRoomService = async (HabitDto: HabitDtoClass, token: TokenInterface): Promise<any> => {

            /** Start,End Date Valid Check **/
            {
                if(!HabitDto.validDate()){
                    throw new ErrorResponse(400, 'Invalid date period', '01');
                    return;
                };
            }

            /** Category Valid Check **/
            {
                const categoryData = await this.HabitDAO.categoryValidCheck(HabitDto.habitCategory);
                if(!categoryData){
                    throw new ErrorResponse(400, 'Invalid categorySeq', '02');
                    return;
                }
            }

            /** Access Valid Check **/
            let habitData, joinData;
            {
                [habitData, joinData] = await this.HabitDAO.getRoomBySeq(HabitDto.habitSeq, token);
                if(!habitData){
                    throw new ErrorResponse(400, 'Nonexistent habitSeq', '03');
                    return;
                }
                if(habitData.habit_status !== 50 && habitData.habit_status !== 30){
                    throw new ErrorResponse(400, 'Bad Status Habit', '04');
                    return;
                }
                if(!joinData || joinData.join_status !== 100){
                    throw new ErrorResponse(400, 'Your Not Join In Habit', '05');
                    return;
                }
                if(joinData.is_leader !== 50){
                    throw new ErrorResponse(400, 'Your Not HeadLeader', '06');
                    return;
                }
            }

            /** Update Room **/
            {
                //TODO when already started habit
                // habitData.start_date
                return await this.HabitDAO.updateRoom(HabitDto, token);
            }

    };

    public deleteRoomService = async (habitSeq: number, token: TokenInterface): Promise<any> => {

            /** Access Valid Check **/
            let habitData, joinData;
            {
                [habitData, joinData] = await this.HabitDAO.getRoomBySeq(habitSeq, token);
                if(!habitData){
                    throw new ErrorResponse(400, 'Nonexistent habitSeq', '03');
                    return;
                }
                if(habitData.habit_status === 10){
                    throw new ErrorResponse(404, 'Already deleted', '04');
                    return;
                }
                if(!joinData || joinData.join_status !== 100){
                    throw new ErrorResponse(400, 'Your Not Join In Habit', '05');
                    return;
                }
                if(joinData.is_leader !== 50){
                    throw new ErrorResponse(400, 'Your Not HeadLeader', '06');
                    return;
                }
            }

            /** Update Room **/
            {
                return await this.HabitDAO.deleteRoom(habitSeq, token);
            }

    };

    // ========================================================================================================================

    public getCategoryService = async (): Promise<any> => {

        const categoryList = await this.HabitDAO.getHabitCategory();

        return categoryList;

    };

}
