import jsPDF from 'jspdf';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanations?: string[];
}

export const generateQuizPDF = (
  questions: Question[],
  userAnswers: Record<number, number>,
  score: number,
  totalQuestions: number,
  correctAnswers: number
) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Quiz Results', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Score Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Score: ${score}%`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Correct Answers: ${correctAnswers} / ${totalQuestions}`, margin, yPosition);
  yPosition += 15;

  // Questions and Answers
  questions.forEach((q, qIndex) => {
    checkPageBreak(60);

    // Question number and text
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Question ${qIndex + 1}:`, margin, yPosition);
    yPosition += lineHeight;

    pdf.setFont('helvetica', 'normal');
    const questionLines = pdf.splitTextToSize(q.question, pageWidth - 2 * margin);
    questionLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += 3;

    // Options
    q.options.forEach((option, oIndex) => {
      checkPageBreak(lineHeight + 3);
      
      const isCorrect = oIndex === q.correctAnswer;
      const isUserAnswer = userAnswers[qIndex] === oIndex;
      
      // Set color based on correctness
      if (isCorrect) {
        pdf.setTextColor(34, 139, 34); // Green for correct
      } else if (isUserAnswer && !isCorrect) {
        pdf.setTextColor(220, 20, 60); // Red for wrong user answer
      } else {
        pdf.setTextColor(0, 0, 0); // Black for other options
      }

      let optionText = `${String.fromCharCode(65 + oIndex)}. ${option}`;
      
      if (isUserAnswer) {
        optionText += ' (Your Answer)';
      }
      if (isCorrect) {
        optionText += ' ✓ Correct';
      }

      const optionLines = pdf.splitTextToSize(optionText, pageWidth - 2 * margin - 5);
      optionLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });
    });

    // Reset color
    pdf.setTextColor(0, 0, 0);

    // Add explanation for wrong answers
    if (userAnswers[qIndex] !== q.correctAnswer && q.explanations && q.explanations[q.correctAnswer]) {
      yPosition += 3;
      checkPageBreak(lineHeight * 3);
      
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.text('Explanation:', margin + 5, yPosition);
      yPosition += lineHeight;
      
      const explanationLines = pdf.splitTextToSize(
        q.explanations[q.correctAnswer],
        pageWidth - 2 * margin - 10
      );
      explanationLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        pdf.text(line, margin + 10, yPosition);
        yPosition += lineHeight;
      });
    }

    yPosition += 10;
  });

  // Save the PDF
  const fileName = `quiz-results-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
