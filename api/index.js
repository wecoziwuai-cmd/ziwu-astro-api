const { astro } = require('iztro'); // 采纳正确导入方式

module.exports = (req, res) => {
  // 允许跨域请求，防止 Make.com 报错
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. 极其严谨地解析请求体 (采纳修正方案)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // 防止解析崩溃
      }
    }
    const date = body.date; // e.g., "1995-06-14"
    const time = body.time; // e.g., "午时"
    const gender = body.gender || '男'; // 兜底性别

    if (!date || !time) {
      return res.status(400).json({ error: '缺少日期或时间参数' });
    }

    // 2. 时辰映射字典
    const timeMap = { '子时':0, '丑时':1, '寅时':2, '卯时':3, '辰时':4, '巳时':5, '午时':6, '未时':7, '申时':8, '酉时':9, '戌时':10, '亥时':11 };
    const timeIndex = timeMap[time] !== undefined ? timeMap[time] : 0;

    // 3. 调用 iztro 进行绝对精准排盘 (采纳修正方案)
    const astrolabe = astro.bySolar(date, timeIndex, gender, true, 'zh-CN');

    // 4. 提取八字日柱 -> 推演五行底色与能量态
    // 双重保险：从 eightCharacters 或 chineseDate 中提取日干
    let dayStem = '甲'; 
    if (astrolabe.eightCharacters && astrolabe.eightCharacters.day) {
        dayStem = astrolabe.eightCharacters.day.charAt(0);
    } else if (astrolabe.chineseDate) {
        dayStem = astrolabe.chineseDate.charAt(4); // 提取如: 庚辰甲申[丙]午庚寅
    }

    const stemMap = {
      '甲': { base: '甲木', energy: '阳' }, '乙': { base: '乙木', energy: '阴' },
      '丙': { base: '丙火', energy: '阳' }, '丁': { base: '丁火', energy: '阴' },
      '戊': { base: '戊土', energy: '阳' }, '己': { base: '己土', energy: '阴' },
      '庚': { base: '庚金', energy: '阳' }, '辛': { base: '辛金', energy: '阴' },
      '壬': { base: '壬水', energy: '阳' }, '癸': { base: '癸水', energy: '阴' }
    };
    
    const stemInfo = stemMap[dayStem] || { base: '甲木', energy: '阳' };

    // 5. 提取命宫 14 主星
    const mingGong = astrolabe.palaces.find(p => p.name === '命宫');
    const majorStar = (mingGong && mingGong.majorStars.length > 0) ? mingGong.majorStars[0].name : '无主星';

    // 6. 提取四化 (化禄, 化权, 化科, 化忌)
    let dynamic = '无四化';
    if (mingGong && mingGong.majorStars.length > 0 && mingGong.majorStars[0].mutagen) {
       dynamic = '化' + mingGong.majorStars[0].mutagen;
    }

    // 7. 提取高阶属性 (命主徽章、辅星词缀、子斗引擎)
    const badge = astrolabe.soul || '无'; 
    const engine = mingGong ? mingGong.earthlyBranch : '子'; 
    let affix = '无'; 
    
    if (mingGong) {
        const allMinors = [...(mingGong.minorStars || []), ...(mingGong.adjectiveStars || [])];
        if (allMinors.length > 0) { 
            affix = allMinors[0].name; 
        }
    }

    // 8. 输出极其纯净的 JSON 供 Make.com 吞咽
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
    console.error("API Error: ", error); // 写入 Vercel 崩溃日志
    res.status(500).json({ "error": "排盘失败", "details": error.message });
  }
};
