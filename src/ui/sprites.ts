/**
 * 10x10 pixel sprites. Each character is one pixel:
 * '.' transparent, 'a' the tint colour passed to <Sprite>, anything else from PALETTE.
 */
export const PALETTE: Record<string, string> = {
  k: '#1b1430', w: '#ffffff', y: '#ffd54a', o: '#ff9f43', r: '#ff5a6e', g: '#4cd964',
  b: '#4aa8ff', p: '#a66bff', n: '#8b5a2b', s: '#f2c9a0', c: '#5ce1e6', d: '#9aa0b5', m: '#ff7ac6',
};

export const SPRITES: Record<string, string[]> = {
  coin: ['...kkkk...', '.kkyyyykk.', '.kyywwyyk.', 'kyywyyyyyk', 'kyywyooyyk', 'kyyyyooyyk', 'kyyyyyyoyk', '.kyyyyoyk.', '.kkyyyykk.', '...kkkk...'],
  food: ['..kkkkkk..', '.kooooook.', 'koowoowook', 'kooooooook', 'kggggggggk', 'knnnnnnnnk', 'kyyyyyyyyk', 'kooooooook', '.kooooook.', '..kkkkkk..'],
  travel: ['..........', '.kkkkkkkk.', 'kbbbbbbbbk', 'kbccbccbck', 'kbccbccbck', 'kbbbbbbbbk', 'kbbbbbbbbk', 'kykbbbbkyk', '.kdk..kdk.', '..........'],
  shopping: ['...kkkk...', '..kk..kk..', '.kkkkkkkk.', 'kmmmmmmmmk', 'kmmmmmmmmk', 'kmmwmmwmmk', 'kmmmwwmmmk', 'kmmmmmmmmk', 'kmmmmmmmmk', '.kkkkkkkk.'],
  bills: ['.kkkkkkkk.', '.kwwwwwwk.', '.kwddddwk.', '.kwwwwwwk.', '.kwddddwk.', '.kwwwwwwk.', '.kwddwwwk.', '.kwwwwwwk.', '.kwkwwkwk.', '.kk.kk.kk.'],
  health: ['..........', '.kkk..kkk.', 'krrrkkrrrk', 'krwrrrrrrk', 'krrrrrrrrk', 'krrrrrrrrk', '.krrrrrrk.', '..krrrrk..', '...krrk...', '....kk....'],
  education: ['..........', '....kk....', '..kkbbkk..', 'kkbbbbbbkk', 'kbbbbbbbbk', 'kkbbbbbbkk', '.kkkbbkkyk', '.kbbbbbkyk', '..kkkkk.yk', '..........'],
  fun: ['..........', '..........', '.kkkkkkkk.', 'kppppppppk', 'kpwppppypk', 'kwwwpprppk', 'kpwppppppk', 'kppkkkkppk', '.kk....kk.', '..........'],
  other: ['..........', '..........', '..........', '..........', 'dd..dd..dd', 'dd..dd..dd', '..........', '..........', '..........', '..........'],
  salary: ['...kkkk...', '...knnk...', '..kkkkkk..', '.knnnnnnk.', 'knnnyynnnk', 'knnynnnnnk', 'knnnyynnnk', 'knnnnnynnk', '.knnyynnk.', '..kkkkkk..'],
  gift: ['..kk..kk..', '.krrkkrrk.', '..kkrrkk..', 'kkkkrrkkkk', 'kggkrrkggk', 'kkkkrrkkkk', '.kgkrrkgk.', '.kgkrrkgk.', '.kgkrrkgk.', '.kkkkkkkk.'],
  house: ['....kk....', '...kook...', '..kooook..', '.kooooook.', 'kkkkkkkkkk', '.kssssssk.', '.kskkssbk.', '.kskkssbk.', '.kskksssk.', '.kkkkkkkk.'],
  flame: ['....kk....', '...kook...', '..kooook..', '..koyook..', '.kooyyook.', '.koyyyyok.', '.koywwyok.', '.kooyyook.', '..kooook..', '...kkkk...'],
  star: ['....kk....', '...kyyk...', '...kyyk...', 'kkkkyykkkk', 'kyyyyyyyyk', '.kyyyyyyk.', '..kyyyyk..', '.kyykkyyk.', '.kyk..kyk.', '.kk....kk.'],
  target: ['..kkkkkk..', '.krrrrrrk.', 'krrwwwwrrk', 'krwwrrwwrk', 'krwrrrrwrk', 'krwrrrrwrk', 'krwwrrwwrk', 'krrwwwwrrk', '.krrrrrrk.', '..kkkkkk..'],
  chest: ['..........', '.kkkkkkkk.', 'knnnnnnnnk', 'knnnnnnnnk', 'kkkkyykkkk', 'kyyyyyyyyk', 'knnnyynnnk', 'knnnnnnnnk', 'knnnnnnnnk', '.kkkkkkkk.'],
  shield: ['.kkkkkkkk.', 'kbbbbbbbbk', 'kbbbwwbbbk', 'kbbbwwbbbk', 'kbwwwwwwbk', 'kbbbwwbbbk', '.kbbwwbbk.', '.kbbbbbbk.', '..kbbbbk..', '...kkkk...'],
  device: ['.kkkkkkkk.', '.kcccccck.', '.kcccccck.', '.kcccccck.', '.kcccccck.', '.kcccccck.', '.kcccccck.', '.kkkkkkkk.', '.kkkwwkkk.', '.kkkkkkkk.'],
  // Single-colour UI icons
  home: ['....aa....', '...aaaa...', '..aaaaaa..', '.aaaaaaaa.', 'aaaaaaaaaa', '.aaaaaaaa.', '.aaa..aaa.', '.aaa..aaa.', '.aaa..aaa.', '..........'],
  list: ['..........', 'aa.aaaaaaa', 'aa.aaaaaaa', '..........', 'aa.aaaaaaa', 'aa.aaaaaaa', '..........', 'aa.aaaaaaa', 'aa.aaaaaaa', '..........'],
  chart: ['..........', '.......aa.', '.......aa.', '....aa.aa.', '....aa.aa.', '.aa.aa.aa.', '.aa.aa.aa.', '.aa.aa.aa.', 'aaaaaaaaaa', '..........'],
  wallet: ['..........', '.aaaaaaaa.', 'aa......aa', 'aaaaaaaaaa', 'aaaa..aaaa', 'aaaa..aaaa', 'aaaaaaaaaa', 'aaaaaaaaaa', 'aaaaaaaaaa', '..........'],
  menu: ['..........', 'aaaaaaaaaa', 'aaaaaaaaaa', '..........', 'aaaaaaaaaa', 'aaaaaaaaaa', '..........', 'aaaaaaaaaa', 'aaaaaaaaaa', '..........'],
  gear: ['....aa....', '.aa.aa.aa.', '.aaaaaaaa.', '..aa..aa..', 'aaa....aaa', 'aaa....aaa', '..aa..aa..', '.aaaaaaaa.', '.aa.aa.aa.', '....aa....'],
  invest: ['..........', '.......kk.', '......kggk', '...kk.kggk', '..kggkkggk', '..kggkkggk', 'kkkggkkggk', 'kggkggkggk', 'kggkggkggk', 'kkkkkkkkkk'],
  calendar: ['.a......a.', 'aaaaaaaaaa', 'aaaaaaaaaa', 'a........a', 'a.aa.aa..a', 'a........a', 'a.aa.aa..a', 'a........a', 'aaaaaaaaaa', '..........'],
  repeat: ['...aaaa.a.', '..aa...aaa', '.aa...aaaa', '.aa.......', '.aa.......', '.......aa.', '.......aa.', 'aaaa...aa.', 'aaa...aa..', '.a.aaaa...'],
  plus: ['..........', '....aa....', '....aa....', '....aa....', '.aaaaaaaa.', '.aaaaaaaa.', '....aa....', '....aa....', '....aa....', '..........'],
};
