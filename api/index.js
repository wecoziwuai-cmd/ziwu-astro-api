const { astro } = require('iztro');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const date = body.date; 
    const time = body.time; 
    const gender = body.gender || '男'; 

    if (!date || !time) {
      return res.status(400).json({ error: '缺少日期或时间参数' });
    }

    const timeMap = { '子时':0, '丑时':1, '寅时':2, '卯时':3, '辰时':4, '巳时':5, '午时':6, '未时':7, '申时':8, '酉时':9, '戌时':10, '亥时':11 };
    const timeIndex = timeMap[time] !== undefined ? timeMap[time] : 0;

    const astrolabe = astro.bySolar(date, timeIndex, gender, true, 'zh-CN');

    // ======= 终极暴力破壁法：提取日柱天干 =======
    // 无论格式怎么变，直接用筛子过滤出所有天干字符，第3个绝对是日干！
    let dayStem = '甲'; 
    if (astrolabe.chineseDate) {
        const tianGan = "甲乙丙丁戊己庚辛壬癸";
        // 把八字拆成单字，过滤出天干
        const stems = astrolabe.chineseDate.split('').filter(char => tianGan.includes(char));
        if (stems.length >= 3) {
            dayStem = stems[2]; // 第 1 个是年干，第 2 个是月干，第 3 个绝对是日干！
        }
    }

    const stemMap = {
      '甲': { base: '甲木', energy: '阳' }, '乙': { base: '乙木', energy: '阴' },
      '丙': { base: '丙火', energy: '阳' }, '丁': { base: '丁火', energy: '阴' },
      '戊': { base: '戊土', energy: '阳' }, '己': { base: '己土', energy: '阴' },
      '庚': { base: '庚金', energy: '阳' }, '辛': { base: '辛金', energy: '阴' },
      '壬': { base: '壬水', energy: '阳' }, '癸': { base: '癸水', energy: '阴' }
    };
    
    const stemInfo = stemMap[dayStem] || { base: '甲木', energy: '阳' };

    // ======= 提取 14 主星 =======
    const mingGong = astrolabe.palaces.find(p => p.name === '命宫');
    const majorStar = (mingGong && mingGong.majorStars.length > 0) ? mingGong.majorStars[0].name : '无主星';

    let dynamic = '无四化';
    if (mingGong && mingGong.majorStars.length > 0 && mingGong.majorStars[0].mutagen) {
       dynamic = '化' + mingGong.majorStars[0].mutagen;
    }

    const badge = astrolabe.soul || '无'; 
    const engine = mingGong ? mingGong.earthlyBranch : '子'; 
    let affix = '无'; 
    
    if (mingGong) {
        const allMinors = [...(mingGong.minorStars || []), ...(mingGong.adjectiveStars || [])];
        if (allMinors.length > 0) { 
            affix = allMinors[0].name; 
        }
    }

    res.status(200).json({
      "energy": stemInfo.energy,
      "base": stemInfo.base,
      "core": majorStar,
      "dynamic": dynamic,
      "badge": badge,
      "affix": affix,
      "engine": engine
    });

  } catch (error) {
    console.error("API Error: ", error); 
    res.status(500).json({ "error": "排盘失败", "details": error.message });
  }
};
