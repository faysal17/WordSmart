import Papa from 'papaparse';

/**
 * Fallback raw CSV snippet to guarantee app works even if public path fetch varies
 */
const EMBEDDED_SAMPLE_CSV = `Chunk,Word,Pronunciation,Part of Speech,Definition
1,ABASH,uh BASH,v,to make ashamed; to embarrass
1,ARCHETYPE,AHR kuh type,n,an original model or pattern An archetype is similar to a prototype.
1,COALESCE,koh uh LES,v,to come together as one; to fuse; to unite
1,DESPOT,DES puht,n,an absolute ruler; an autocrat
1,EXTRICATE,EK struh kayt,v,to free from difficulty
1,INCENSE,in SENS,v,to make very angry
1,MATRICULATE,muh TRIK yuh layt,v,to enroll especially at a college
1,PERJURY,PUR jur ee,n,lying under oath
1,RECLUSIVE,ri KLOOS iv,adj,hermitlike; withdrawn from society
1,SUBTLE,SUT ul,adj,not obvious; able to make fine distinctions; ingenious; crafty
2,ABATE,uh BAYT,v,to subside; to reduce
2,ARDENT,AHR dunt,adj,passionate; enthusiastic
2,COERCE,koh URS,v,to force someone to do or not to do something
2,DESTITUTE,DES tuh toot,adj,extremely poor; utterly lacking
2,EXTROVERT,EKS truh vurt,n,an open outgoing person
2,INCESSANT,in SES unt,adj,unceasing
2,MAUDLIN,MAWD lin,adj,silly and overly sentimental
2,PERMEATE,PUR mee ayt,v,to spread or seep through; to penetrate
2,RECONDITE,REK un dyte,adj,hard to understand; over one's head
2,SUBVERSIVE,sub VUR siv,adj,corrupting; overthrowing; undermining; insurgent
3,ABDICATE,AB duh kayt,v,to step down from a position of power or responsibility
3,ARDUOUS,AHR joo us,adj,hard; difficult
3,COGENT,KOH junt,adj,powerfully convincing
3,DESULTORY,DES ul tor ee,adj,without a plan or purpose; disconnected; random
3,EXULT,ig ZULT,v,to rejoice; to celebrate
3,INCIPIENT,in SIP ee unt,adj,beginning; emerging
3,MAVERICK,MAV ur ik,n,a nonconformist; a rebel
3,PERNICIOUS,pur NISH us,adj,deadly; extremely evil
3,RECRIMINATION,ri krim uh NAY shun,n,a bitter counteraccusation
3,SUCCINCT,suk SINGKT,adj,brief and to the point; concise`;

export async function loadVocabularyCSV() {
  try {
    const response = await fetch('/wordsmart_vocabulary_chunks.csv');
    if (response.ok) {
      const csvText = await response.text();
      return parseCSVText(csvText);
    }
  } catch (err) {
    console.warn('Network fetch for CSV failed, using fallback vocabulary loader:', err);
  }

  // Use embedded fallback if fetch fails
  return parseCSVText(EMBEDDED_SAMPLE_CSV);
}

function parseCSVText(csvText) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedWords = results.data.map((row) => {
          const wordText = (row.Word || '').trim();
          return {
            id: `word_${wordText.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            chunk: parseInt(row.Chunk, 10) || 1,
            word: wordText,
            pronunciation: (row.Pronunciation || '').trim(),
            partOfSpeech: (row['Part of Speech'] || '').trim(),
            definition: (row.Definition || '').trim(),
          };
        }).filter(w => w.word.length > 0);

        resolve(parsedWords);
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}
