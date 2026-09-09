import React, { useMemo } from 'react';
import { ClipboardList, Target, TrendingUp, Rocket, Clock, MessageSquare } from 'lucide-react';
import { SectionCard, Chip } from './LeadCardPrimitives';
import { sortAnswers, getAnswerContent, hasValue } from '../leadDetailsHelpers';

const QUESTION_ICONS = {
  learner_goal: Target,
  learner_level: TrendingUp,
  learner_motivation: Rocket,
  learner_time: Clock,
};

const AnswerBody = ({ content, childAnswers }) => {
  if (content.type === 'text') {
    return hasValue(content.text) ? (
      <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
        {content.text}
      </div>
    ) : (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No answer provided</p>
    );
  }

  if (content.values.length === 0 && !hasValue(content.text) && (!childAnswers || childAnswers.length === 0)) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 italic">No answer provided</p>;
  }

  return (
    <div className="space-y-2.5">
      {content.values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {content.values.map((value, idx) => <Chip key={`${value}-${idx}`}>{value}</Chip>)}
        </div>
      )}
      {hasValue(content.text) && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="text-gray-400 dark:text-gray-500">Other: </span>{content.text}
        </p>
      )}
      {childAnswers && childAnswers.length > 0 && (
        <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
          {/* <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            Related Topics
          </div> */}
          <div className="flex flex-wrap gap-1.5">
            {childAnswers.map((child, idx) => (
              <span
                key={`child-${idx}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
              >
                {child}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SignupQuestionCard = ({ answer, index }) => {
  const Icon = QUESTION_ICONS[answer.questionKey] || MessageSquare;
  const content = getAnswerContent(answer);
  const number = String(index + 1).padStart(2, '0');
  const childAnswers = Array.isArray(answer.childAnswers) ? answer.childAnswers : null;

  return (
    <div className="group relative rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 lg:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold tracking-widest text-blue-600/70 dark:text-blue-300/70">{number}</span>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
            {hasValue(answer.question) ? answer.question : 'Untitled question'}
          </h3>
          <AnswerBody content={content} childAnswers={childAnswers} />
        </div>
      </div>
    </div>
  );
};

const SignupQuestionnaire = ({ answers }) => {
  const sorted = useMemo(() => sortAnswers(answers), [answers]);

  return (
    <SectionCard
      title="Signup Questionnaire"
      icon={ClipboardList}
      action={sorted.length > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{sorted.length} responses</span>}
    >
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <ClipboardList className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No signup questionnaire responses are available for this lead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((answer, index) => (
            <SignupQuestionCard key={answer.questionId ?? `${answer.questionKey}-${index}`} answer={answer} index={index} />
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default SignupQuestionnaire;
