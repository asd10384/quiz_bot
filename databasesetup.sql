-- 데이터베이스 확인
SHOW DATABASES;

-- 데이터베이스 생성
CREATE DATABASE example default character set utf8 collate utf8_general_ci;

-- 데이터 베이스 선택
USE example;

-- 테이블 생성
CREATE TABLE `guild` (
	`id` CHAR(18) NOT NULL COLLATE utf8_general_ci,
  `name` TEXT NOT NULL COLLATE utf8_general_ci,
  `prefix` TEXT NOT NULL COLLATE utf8_general_ci,
  `role` TEXT NOT NULL COLLATE utf8_general_ci,
	`channelId` CHAR(18) NOT NULL COLLATE utf8_general_ci,
	`msgId` CHAR(18) NOT NULL COLLATE utf8_general_ci,
  `scoreId` CHAR(18) NOT NULL COLLATE utf8_general_ci,
  `options` TEXT NOT NULL COLLATE utf8_general_ci,
  PRIMARY KEY (`id`)
) default charset=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `user` (
	`id` CHAR(18) NOT NULL COLLATE utf8_general_ci,
  `tag` TEXT NOT NULL COLLATE utf8_general_ci,
  primary key (`id`)
) default charset=utf8 COLLATE=utf8_general_ci;

-- 테이블 확인
SHOW TABLES;

-- guild 테이블 확인
SELECT * from guild;

-- 테이블 타입확인
SHOW COLUMNS FROM `guild`;

-- 테이블 제거
DROP TABLE guild;

-- 데이터 제거
DELETE FROM user WHERE id='';

-- 오류발생시 CODE: 1251
-- https://velog.io/@jdk9908/%EC%99%B8%EB%B6%80%EC%97%90%EC%84%9C-MySQL-%EC%A0%91%EC%86%8D%ED%95%98%EA%B8%B0
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'pw';
-- 위 명령어 실행후 오류발생시 CODE: 1045
-- 비밀번호 다시확인
