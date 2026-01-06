
const PASSAGE_91 = "An investigator designer an experiment to see the effect of illumination level and duration of visual signal on detectability of change in illumination in a dark room on 120 randomly selected sample of college going male students. She decided to use low and high levels of illumination and three levels of duration of stimulus i.e. 10, 20 and 50 milliseconds through an electric chronoscopic tachistoscope. The participant participants were divided into various combination of treatments. These participants were required to press a 'Yes' button if they detect the signal or 'No' button if they do not. Each participant was given a total of 50 trials within which 10 signals were randomly presented. Proportions of hits and false alarms were computed for each participant and were used to get answers to research questions.";

const PASSAGE_96 = "A group of researchers were curious to understand the behaviour of guards in prisons and wanted to know whether it was due to dispositional (personality) or environment dependent (situational) factors. To clarify the roles of guards and prisoners they created a mock prison. 22 male unifarer with each other volunteered to participate in the study and were assigned the role of prisoners and guards. Both adopted their new roles. A rebellion on the second day led to harsh resolution by the guards. Relative to a day 128 was taken to punish the prisoners. The researchers intended to run the experiment for 2 weeks. It was however, terminated on the sixth day due to the emotional breakdown of prisoners and increasing aggression by the guards. The experiment revealed how people conform to the social roles they are expected to play.";

if (window.RAW_MCQ_DATA) {
    window.RAW_MCQ_DATA.forEach(q => {
        if (q.id >= 91 && q.id <= 95) q.passage = PASSAGE_91;
        if (q.id >= 96 && q.id <= 100) q.passage = PASSAGE_96;
    });
}
