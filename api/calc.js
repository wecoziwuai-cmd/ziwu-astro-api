const { astroBySolar } = require("iztro");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { date, hour } = req.body;

    if (!date || hour === undefined) {
      return res.status(400).json({ error: "Missing params" });
    }

    const result = astroBySolar({
      date: date,
      hour: Number(hour)
    });

    const output = {
      energy: result.yinYang,
      element: result.heavenlyStem,
      mainStar: result.mainStar,
      transform: result.transform,
      bodyStar: result.bodyStar,
      subStars: result.subStars,
      branch: result.earthlyBranch
    };

    res.status(200).json(output);

  } catch (err) {
    res.status(500).json({
      error: "Calculation failed",
      detail: err.message
    });
  }
};
