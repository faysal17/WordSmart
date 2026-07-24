import Papa from 'papaparse';

/**
 * Fallback raw CSV snippet to guarantee app works even if public path fetch varies
 */
const EMBEDDED_SAMPLE_CSV = `Chunk,Word,Pronunciation,Part of Speech,Definition,Sentence
1,ABASH,uh BASH,v,to make ashamed; to embarrass,He was abashed by the public criticism.
1,ARCHETYPE,AHR kuh type,n,an original model or pattern An archetype is similar to a prototype.,The hero's journey is a common archetype in literature.
1,COALESCE,koh uh LES,v,to come together as one; to fuse; to unite,The puddles coalesced into a single large pond.
1,DESPOT,DES puht,n,an absolute ruler; an autocrat,The despot ruled the country with an iron fist.
1,EXTRICATE,EK struh kayt,v,to free from difficulty,It took hours to extricate the car from the mud.
1,INCENSE,in SENS,v,to make very angry,His rude remarks incensed the crowd.
1,MATRICULATE,muh TRIK yuh layt,v,to enroll especially at a college,She will matriculate at the university this fall.
1,PERJURY,PUR jur ee,n,lying under oath,He was arrested for perjury after lying in court.
1,RECLUSIVE,ri KLOOS iv,adj,hermitlike; withdrawn from society,The reclusive author rarely left his home.
1,SUBTLE,SUT ul,adj,not obvious; able to make fine distinctions; ingenious; crafty,The soup had a subtle flavor of garlic.
2,ABATE,uh BAYT,v,to subside; to reduce,The storm began to abate after midnight.
2,ARDENT,AHR dunt,adj,passionate; enthusiastic,She is an ardent supporter of environmental protection.
2,COERCE,koh URS,v,to force someone to do or not to do something,He was coerced into signing the confession.
2,DESTITUTE,DES tuh toot,adj,extremely poor; utterly lacking,The charity helps families who are left destitute.
2,EXTROVERT,EKS truh vurt,n,an open outgoing person,Being an extrovert she loves attending social gatherings.
2,INCESSANT,in SES unt,adj,unceasing,The incessant rain caused minor flooding.
2,MAUDLIN,MAWD lin,adj,silly and overly sentimental,The movie became maudlin near the end.
2,PERMEATE,PUR mee ayt,v,to spread or seep through; to penetrate,The smell of coffee permeated the kitchen.
2,RECONDITE,REK un dyte,adj,hard to understand; over one's head,The professor discussed a recondite aspect of physics.
2,SUBVERSIVE,sub VUR siv,adj,corrupting; overthrowing; undermining; insurgent,He was arrested for distributing subversive leaflets.
3,ABDICATE,AB duh kayt,v,to step down from a position of power or responsibility,The king decided to abdicate the throne in favor of his son.
3,ARDUOUS,AHR joo us,adj,hard; difficult,Climbing the mountain was an arduous task.
3,COGENT,KOH junt,adj,powerfully convincing,She presented a cogent argument for changing the rules.
3,DESULTORY,DES ul tor ee,adj,without a plan or purpose; disconnected; random,We had a desultory conversation about the weather.
3,EXULT,ig ZULT,v,to rejoice; to celebrate,The fans exulted in their team's victory.
3,INCIPIENT,in SIP ee unt,adj,beginning; emerging,The doctor detected an incipient cold and prescribed rest.
3,MAVERICK,MAV ur ik,n,a nonconformist; a rebel,He is a maverick who refuses to follow established rules.
3,PERNICIOUS,pur NISH us,adj,deadly; extremely evil,Fake news can have a pernicious influence on public opinion.
3,RECRIMINATION,ri krim uh NAY shun,n,a bitter counteraccusation,The meeting dissolved into angry recriminations.
3,SUCCINCT,suk SINGKT,adj,brief and to the point; concise,The manager gave a succinct summary of the project.`;

export async function loadVocabularyCSV() {
  try {
    // Append a cache-buster query parameter to force loading the latest CSV file
    const response = await fetch('/wordsmart_vocabulary_chunks.csv?t=' + Date.now());
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
            sentence: (row.Sentence || '').trim(),
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
