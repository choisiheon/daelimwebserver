const express = require('express'); // Express 모듈을 불러옵니다.
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express(); // Express 애플리케이션을 생성합니다.
const PORT = process.env.PORT || 3000; // 기본 포트를 설정하거나 3000 포트를 사용합니다.
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = 'qwertasdfgzxcvb';

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
  secret: '임의의_비밀키',
  resave: false,
  saveUninitialized: false,
}));
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === 'OPTIONS') {
      res.sendStatus(200);
  } else {
      next();
  }
});

// 로깅 미들웨어
const logginMiddleware =(req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // 다음 미들웨어로 요청을 전달
};

const sessionAuthMiddleware = (req, res, next) => {
  if (req.session.user) {
    console.log(req,session.user)
    next();
  } else {
    res.status(401).send('인증되지 않은 사용자입니다.');
  }
};

const tokenAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader.split(' ')[1];

  if (!authHeader || !token) {
    return res.status(403).send('비정상 접근입니다.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('정상적이지 않은 토큰입니다.');
  }
  next();
};

const users = [
  {id: "hong", name: '홍길동', pwd: '1234'},
  {id: "kim", name: '김길동', pwd: '1234'},
  {id: "so", name: '소길동', pwd: '1234'},
  {id: "na", name: '나길동', pwd: '1234'},
];

// 루트 경로 ('/')에 대한 GET 요청을 처리합니다.
app.get('/', sessionAuthMiddleware, (req, res) => { 
   res.send('Hello, Express.js!');
});

// 유저 검색
app.get('/user', tokenAuthMiddleware, (req, res) => {
  const {id} = req.query;
  
  if(id){
    const resultUser = users.find((userData) => { 
      return userData.id ===id 
    });

    if(resultUser){
      res.send(resultUser);
    }
    else res.status(400).send('해당 사용자를 찾을수 없습니다.');
  } 
  else res.send(users);
});

// 새로운 유저 추가
app.post('/user', (req, res) => {
  const { id, name, pwd } = req.body;
  // 입력된 id가 이미 존재하는지 확인
  const checkUser = users.find(user => user.id === id);
  if (checkUser) {
    return res.status(400).json({ message: '이미 존재하는 ID입니다.' });
  }

  // 비밀번호 길이 확인
  if (pwd.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }

  // 새로운 유저 배열에 추가
  users.push({ id, name, pwd });
  res.json({ message: '새로운 유저가 추가되었습니다.'});
  });

// 로그인
app.post('/session/login', logginMiddleware, (req, res) => { 
  const { id, pwd } = req.body;
  const user = users.find(user => user.id === id && user.pwd === pwd);

  if (user) {
    req.session.user = {id: user.id, name: user.name};
    res.send('로그인 성공');
  } 
  else {
    res.status(401).send('로그인 실패');
  }
});
// 로그아웃
app.get('/session/logout', (req, res) => {
  req.session.destroy();
  res.send('로그아웃 성공');
});

app.put('/user', (req, res) => {
  const { id, name, pwd } = req.body;

  // id에 해당하는 유저 찾기
  const updateUserIndex = users.findIndex(user => user.id === id);

  // id에 해당하는 유저가 없는 경우
  if (updateUserIndex === -1) {
    return res.status(404).json({ message: '해당 ID의 사용자를 찾을 수 없습니다.' });
  }

  // 비밀번호가 8자 미만인 경우
  if (pwd && pwd.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }

  // 유저 정보 업데이트
  if (name) {
    users[updateUserIndex].name = name;
  }
  if (pwd) {
    users[updateUserIndex].pwd = pwd;
  }

  res.json({ message: '사용자 정보가 업데이트 되었습니다.' });
});

app.delete('/user', (req, res) => {
  const { id } = req.body;

  // id에 해당하는 유저 찾기
  const deleteUserIndex = users.findIndex(user => user.id === id);

  // id에 해당하는 유저가 없는 경우
  if (deleteUserIndex === -1) {
    return res.status(404).json({ message: '해당 ID의 사용자를 찾을 수 없습니다.' });
  }

  // 유저 삭제
  users.splice(deleteUserIndex, 1); 

  res.json({ message: '사용자가 삭제되었습니다.' });
});

//토큰
app.post('/token/login', (req, res) => {
  const { id, pwd } = req.body;
  const user = users.find(user => user.id === id && user.pwd === pwd);
  if (user) {
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET_KEY, { expiresIn: '1h' });
    res.json({ token , userName:user.name });
  } else {
    res.status(401).send('로그인 실패');
  }
});

// 서버를 설정한 포트에서 실행합니다.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});