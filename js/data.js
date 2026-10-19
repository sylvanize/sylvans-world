const SITE = {
  title: "sylvan's world",
  motto: "到过的城市，读过的书，反复看的片和听过的唱片。",

  /* ---------- 摄影: 按地区 ---------- */
  places: [
    {
      id: "gzzh",
      name: "广州·珠海",
      country: "中国",
      coords: [],
      date: "2026.5",
      intro: "可恶的通勤",
      photos: []
    },
    {
      id: "spring26",
      name: "春天",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2026 春",
      intro: "春日序章",
      photos: []
    },
    {
      id: "shenzhen",
      name: "深圳",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2024 12",
      intro: "深圳湾海鸥",
      photos: []
    },
    {
      id: "changlong",
      name: "长隆",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2024 11",
      intro:"珠海长隆同haki"
    },
    {
      id: "taiwan",
      name: "台湾",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2025 秋",
      intro: "秋天秋天秋天",
      photos: []
    },
    {
      id: "beikao",
      name: "26备考",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2026.5",
      intro: "悲情城市！",
      photos: []
    },
    {
      id: "muchcoffee",
      name: "众咖啡巧克力日",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2026.5",
      intro: "寻觅松茸",
      photos: []
    },
    {
      id: "train",
      name: "西宁火车",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2026.8",
      intro: "从沙漠看到大草原",
      photos: []
    },
    {
      id: "jiuquan",
      name: "酒泉",
      country: "中国",
      coords: [102.8329, 24.8801],
      date: "2026.8",
      intro: "孤独地貌",
      photos: []
    },
    {
      id: "delingha",
      name: "德令哈",
      country: "中国",
      coords: [],
      date: "2026.8",
      intro: "同我在柏树山放羊",
      photos: []
    },
    {
      id: "down",
      name: "A nossa única riqueza é ver",
      country: "oo",
      coords: [],
      date: "oooo",
      intro: "00000",
      photos: [],
      /* 企鹅相册标记：让它在照片列里拥有"停留举起相机"效果。
         永远放在 places 数组最后一条即可，它会一直待在列表末尾。 */
      egg: true
    }
  ],

  /* ---------- 电影 ---------- */
  films: [
    { title: "脸庞村庄", creator: "阿涅斯·瓦尔达 / JR", year: "2017", cover: "covers/films/face-places.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] },
    { title: "驾驶我的车", creator: "滨口龙介", year: "2021", cover: "covers/films/drive-my-car.jpg", note: "", country: "日本", coords: [139.6917, 35.6895] },
    { title: "我爱你，我爱你", creator: "阿伦·雷乃", year: "1968", cover: "covers/films/je-taime-je-taime.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] },
    { title: "纪录说谎家", creator: "阿涅斯·瓦尔达", year: "2000", cover: "covers/films/gleaners-and-i.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] },
    { title: "爱在黎明破晓前", creator: "理查德·林克莱特", year: "1995", cover: "covers/films/before-sunrise.jpg", note: "", country: "奥地利", coords: [16.3738, 48.2082] },
    { title: "Doctor X", creator: "朝日电视台", year: "2012-2021", cover: "covers/films/doctor-x.jpg", note: "", country: "日本", coords: [139.6917, 35.6895] },
    { title: "伟大的自由", creator: "塞巴斯蒂安·迈泽", year: "2021", cover: "covers/films/great-freedom.jpg", note: "", country: "德国", coords: [13.4050, 52.5200] },
    { title: "新桥恋人", creator: "莱奥·卡拉克斯", year: "1991", cover: "covers/films/lovers-on-bridge.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] }
  ],

  /* ---------- 书籍 ---------- */
  books: [
    { title: "地粮·新粮", creator: "安德烈·纪德", year: "1897", cover: "covers/books/nourritures-terrestres.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] },
    { title: "西西弗神话", creator: "阿尔贝·加缪", year: "1942", cover: "covers/books/myth-of-sisyphus.jpg", note: "", country: "法国", coords: [2.3522, 48.8566] },
    { title: "我与地坛", creator: "史铁生", year: "1991", cover: "covers/books/me-and-temple.jpg", note: "", country: "中国", coords: [116.4074, 39.9042] },
    { title: "爱你就像爱生命", creator: "王小波 / 李银河", year: "2004", cover: "covers/books/love-you-like-life.jpg", note: "", country: "中国", coords: [116.4074, 39.9042] }
  ],

  /* ---------- 音乐 ---------- */
  music: [
    { title: "家", artist: "陈绮贞", cover: "covers/music/cheer-home.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "诡计", artist: "何欣穗", cover: "covers/music/ciacia-trick.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "生活的答案", artist: "洪申豪", cover: "covers/music/hung-life-answer.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "思念是一种病", artist: "张震岳", cover: "covers/music/a-yue-sickness.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "麦恩莉", artist: "方大同", cover: "covers/music/khalil-my-only.jpg", note: "", country: "中国香港", coords: [114.1694, 22.3193] },
    { title: "First Love", artist: "宇多田光", cover: "covers/music/utada-first-love.jpg", note: "", country: "日本", coords: [139.6917, 35.6895] },
    { title: "铁之贝克", artist: "Tizzy Bac", cover: "covers/music/tizzy-iron.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "如何", artist: "张悬", cover: "covers/music/deserts-how.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] },
    { title: "Never Been Kissed", artist: "at17", cover: "covers/music/at17-never.jpg", note: "", country: "中国香港", coords: [114.1694, 22.3193] },
    { title: "大人中", artist: "卢广仲", cover: "covers/music/crowd-adult.jpg", note: "", country: "中国台湾", coords: [121.5654, 25.0330] }
  ],

  /* ---------- 游戏 ---------- */
  games: [
    { title: "死亡搁浅", creator: "小岛秀夫", year: "2019", cover: "covers/games/death-stranding.jpg", note: "", country: "日本", coords: [139.6917, 35.6895] },
    { title: "死亡搁浅 2", creator: "小岛秀夫", year: "2025", cover: "covers/games/death-stranding-2.jpg", note: "", country: "日本", coords: [139.6917, 35.6895] },
    { title: "空洞骑士", creator: "Team Cherry", year: "2017", cover: "covers/games/hollow-knight.jpg", note: "", country: "澳大利亚", coords: [149.1300, -35.2809] }
  ]
};
