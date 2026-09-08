// HMBR Book III §§4–6 and Appendix A, draft 2026-09-08.
export const VERSION = "draft-2026-09-08";
export const CONSONANTS = {
  "p": {
    "id": "JV-P",
    "onset": "1111",
    "coda": "11C1"
  },
  "b": {
    "id": "JV-B",
    "onset": "1107",
    "coda": "11B8"
  },
  "t": {
    "id": "JV-T",
    "onset": "1110",
    "coda": "11C0"
  },
  "d": {
    "id": "JV-D",
    "onset": "1103",
    "coda": "11AE"
  },
  "k": {
    "id": "JV-K",
    "onset": "110F",
    "coda": "11BF"
  },
  "ɡ": {
    "id": "JV-G",
    "onset": "1100",
    "coda": "11A8"
  },
  "f": {
    "id": "JV-F",
    "onset": "114B",
    "coda": "11F4"
  },
  "v": {
    "id": "JV-V",
    "onset": "1144",
    "coda": "11E6"
  },
  "θ": {
    "id": "JV-TH",
    "onset": "1145",
    "coda": null
  },
  "ð": {
    "id": "JV-DH",
    "onset": "1142",
    "coda": null
  },
  "s": {
    "id": "JV-S",
    "onset": "1109",
    "coda": "11BA"
  },
  "z": {
    "id": "JV-Z",
    "onset": "1136",
    "coda": "D7EF"
  },
  "ʃ": {
    "id": "JV-SH",
    "onset": "1140",
    "coda": "11EB"
  },
  "ʒ": {
    "id": "JV-ZH",
    "onset": "1146",
    "coda": null
  },
  "tʃ": {
    "id": "JV-CH",
    "onset": "1149",
    "coda": null
  },
  "dʒ": {
    "id": "JV-JH",
    "onset": "1148",
    "coda": null
  },
  "h": {
    "id": "JV-H",
    "onset": "1112",
    "coda": null
  },
  "m": {
    "id": "JV-M",
    "onset": "1106",
    "coda": "11B7"
  },
  "n": {
    "id": "JV-N",
    "onset": "1102",
    "coda": "11AB"
  },
  "ŋ": {
    "id": "JV-NG",
    "onset": null,
    "coda": "11BC"
  },
  "l": {
    "id": "JV-L",
    "onset": "1105",
    "coda": "11AF"
  },
  "ɹ": {
    "id": "JV-R",
    "onset": "A976",
    "coda": "D7DB"
  },
  "j": {
    "id": "JV-Y",
    "onset": "1159",
    "coda": null
  },
  "w": {
    "id": "JV-W",
    "onset": "1147",
    "coda": null
  }
};
export const VOWELS = {
  "i": {
    "ids": [
      "JV-I"
    ],
    "codes": [
      "1175"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɪ": {
    "ids": [
      "JV-KIT"
    ],
    "codes": [
      "119D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɛ": {
    "ids": [
      "JV-E"
    ],
    "codes": [
      "1166"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "e": {
    "ids": [
      "JV-E"
    ],
    "codes": [
      "1166"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "æ": {
    "ids": [
      "JV-AE"
    ],
    "codes": [
      "1162"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɑ": {
    "ids": [
      "JV-A"
    ],
    "codes": [
      "1161"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "a": {
    "ids": [
      "JV-A"
    ],
    "codes": [
      "1161"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɒ": {
    "ids": [
      "JV-O"
    ],
    "codes": [
      "1169"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "o": {
    "ids": [
      "JV-O"
    ],
    "codes": [
      "1169"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɔ": {
    "ids": [
      "JV-AW"
    ],
    "codes": [
      "1182"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "u": {
    "ids": [
      "JV-U"
    ],
    "codes": [
      "116E"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ʊ": {
    "ids": [
      "JV-FOOT"
    ],
    "codes": [
      "118D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ʌ": {
    "ids": [
      "JV-EO"
    ],
    "codes": [
      "1165"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ə": {
    "ids": [
      "JV-SCHWA"
    ],
    "codes": [
      "119E"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "iː": {
    "ids": [
      "JV-I",
      "JV-I"
    ],
    "codes": [
      "1175",
      "1175"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "uː": {
    "ids": [
      "JV-U",
      "JV-U"
    ],
    "codes": [
      "116E",
      "116E"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɑː": {
    "ids": [
      "JV-A",
      "JV-A"
    ],
    "codes": [
      "1161",
      "1161"
    ],
    "modules": [
      "rp"
    ]
  },
  "ɔː": {
    "ids": [
      "JV-O",
      "JV-O"
    ],
    "codes": [
      "1169",
      "1169"
    ],
    "modules": [
      "rp"
    ]
  },
  "ɜː": {
    "ids": [
      "JV-EO",
      "JV-EO"
    ],
    "codes": [
      "1165",
      "1165"
    ],
    "modules": [
      "rp"
    ]
  },
  "ɛː": {
    "ids": [
      "JV-E",
      "JV-E"
    ],
    "codes": [
      "1166",
      "1166"
    ],
    "modules": [
      "rp"
    ]
  },
  "eɪ": {
    "ids": [
      "JV-E",
      "JV-KIT"
    ],
    "codes": [
      "1166",
      "119D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "aɪ": {
    "ids": [
      "JV-A",
      "JV-KIT"
    ],
    "codes": [
      "1161",
      "119D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "ɔɪ": {
    "ids": [
      "JV-O",
      "JV-KIT"
    ],
    "codes": [
      "1169",
      "119D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "aʊ": {
    "ids": [
      "JV-A",
      "JV-FOOT"
    ],
    "codes": [
      "1161",
      "118D"
    ],
    "modules": [
      "rp",
      "ga"
    ]
  },
  "əʊ": {
    "ids": [
      "JV-SCHWA",
      "JV-FOOT"
    ],
    "codes": [
      "119E",
      "118D"
    ],
    "modules": [
      "rp"
    ]
  },
  "oʊ": {
    "ids": [
      "JV-O",
      "JV-FOOT"
    ],
    "codes": [
      "1169",
      "118D"
    ],
    "modules": [
      "ga"
    ]
  },
  "ɪə": {
    "ids": [
      "JV-KIT",
      "JV-SCHWA"
    ],
    "codes": [
      "119D",
      "119E"
    ],
    "modules": [
      "rp"
    ]
  },
  "ʊə": {
    "ids": [
      "JV-FOOT",
      "JV-SCHWA"
    ],
    "codes": [
      "118D",
      "119E"
    ],
    "modules": [
      "rp"
    ]
  }
};
