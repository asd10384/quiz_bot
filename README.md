# QUIZ BOT [discord bot]

**[Image to be added / 이미지 추가 예정]**  


## Information / 정보

 * This discode bot is made of typescript.
 * 이 디스코드 봇은 타입스크립트로 제작되었습니다.

### Prerequisites / 선행조건

```
Node.js must be installed.
Node.js가 설치되어 있어야 합니다.
```

### Installing / 설치

```
npm install -g ts-node && npm i -g npm-check-updates && npm i sodium --ignore-scripts --save --force && npm i --save-dev --force typescript ts-node ts-node-dev && npm i --save-dev --force ts-cleaner nodemon @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise && npm i @discordjs/voice --save --force && npm i prism-media --save --force && npm i @discordjs/opus --save --force && npm i opusscript --save --force && npm i libsodium-wrappers --save --force && npm i tweetnacl --save --force && ncu -u && npm install --force
```

### Start / 시작

 1.  [**`.env.example`**](https://github.com/asd10384/quiz_bot/blob/main/.env.example) 파일을 참고해 **`.env`** 파일생성
 2.  [**`설치`**](https://github.com/asd10384/quiz_bot#installing--%EC%84%A4%EC%B9%98)
 3.  **DEV** 상태라면 **`npm run dev`**로 봇 실행
 4.  **PRODUCTION** 상태라면 **`npm run build`**로 **ts->js**로 변환 후 **`npm run start`**로 봇 실행

## Built With / 누구랑 만들었나요?

* [tkrmagid](https://github.com/asd10384) - Create bot & quiz site.
* [kacarong](https://github.com/kacarong) - Added data to the quiz site.
