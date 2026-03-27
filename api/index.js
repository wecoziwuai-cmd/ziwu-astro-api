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

    // ======= 修复核心：精准且暴力的日柱天干抓取法 =======
    let dayStem = '甲'; 
    if (astrolabe.eightCharacters && astrolabe.eightCharacters.day) {
        dayStem = astrolabe.eightCharacters.day.charAt(0);
    } else if (astrolabe.chineseDate) {
        // 利用正则匹配，死死盯住"月"字后面的第一个字符（也就是日干）
        const match = astrolabe.chineseDate.match(/月\s*(.)/);
        if (match && match[1]) {
            dayStem = match[1];
        }
    }

    const stemMap = {
      '甲': { base: '甲木', energy: '阳' }, '乙': { base: '乙木', energy: '阴' },
      '丙': { base: '丙火', energy: '阳' }, '丁': { base: '丁火', energy: '阴' },
      '戊': { base: '戊土', energy: '阳' }, '己': { base: '己土', energy: '阴' },
      '庚': { base: '庚金', energy: '阳' }, '辛': { base: '辛金', energy: '阴' },
      '壬': { base: '壬水', energy: '阳' }, '癸': { base: '癸水', energy: '阴' }
    };
    
    // 映射对应五行与阴阳
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
