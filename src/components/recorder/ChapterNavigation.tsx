import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Chapter } from '../../types';
import Button from '../ui/Button';

interface ChapterNavigationProps {
  chapters: Chapter[];
  selectedChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
  recordings: any[];
}

const ChapterNavigation: React.FC<ChapterNavigationProps> = ({
  chapters,
  selectedChapterId,
  onChapterSelect,
  recordings
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const getChapterQuestionStats = (chapter: Chapter) => {
    const totalQuestions = chapter.question_order?.length || 0;
    const answeredQuestions = recordings.filter(r => r.chapter_id === chapter.id).length;
    return { answered: answeredQuestions, total: totalQuestions };
  };

  useEffect(() => {
    if (selectedChapterId && scrollContainerRef.current) {
      const selectedElement = scrollContainerRef.current.querySelector(
        `[data-chapter-id="${selectedChapterId}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [selectedChapterId]);

  return (
    <div className="relative mb-8">
      <div className="flex items-center">
        <Button
          onClick={scrollLeft}
          icon={ChevronLeft}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 mr-2"
        />

        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide flex-1 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {chapters.map((chapter) => {
            const { answered, total } = getChapterQuestionStats(chapter);
            const isSelected = selectedChapterId === chapter.id;

            return (
              <div
                key={chapter.id}
                data-chapter-id={chapter.id}
                onClick={() => onChapterSelect(chapter.id)}
                className={`
                  flex-shrink-0 w-64 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                <h3 className={`font-medium mb-2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {chapter.title}
                </h3>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{answered} de {total} preguntas completadas</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        <Button
          onClick={scrollRight}
          icon={ChevronRight}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 ml-2"
        />
      </div>
    </div>
  );
};

export default ChapterNavigation;