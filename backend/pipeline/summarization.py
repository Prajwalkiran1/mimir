"""Phase 3: Basic Text Summarization Component"""

import os
import logging
from typing import Dict, Any, List, Optional
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
import numpy as np
import heapq

logger = logging.getLogger(__name__)

class TextSummarizer:
    """Handles basic text summarization using extractive methods only"""
    
    def __init__(self):
        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            # Download NLTK data if not available
            nltk.download('stopwords')
            nltk.download('punkt')
            self.stop_words = set(stopwords.words('english'))
        
    async def generate_summary(
        self, 
        transcript: Dict[str, Any], 
        topic: Optional[str] = None,
        summary_type: str = "extractive",
        max_sentences: int = 5,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Generate summary from transcript
        
        Args:
            transcript: Transcription results
            topic: Optional topic for focused summarization
            summary_type: Type of summarization (extractive/abstractive)
            max_sentences: Maximum number of sentences in summary
            progress_callback: Callback function for progress updates
            
        Returns:
            Dictionary containing summary results
        """
        try:
            if progress_callback:
                progress_callback("Preparing transcript for summarization...", 60)
            
            # Extract text from transcript
            full_text = self._extract_text_from_transcript(transcript)
            
            if not full_text or len(full_text.strip()) < 50:
                return self._generate_empty_summary()
            
            if progress_callback:
                progress_callback("Analyzing text structure...", 70)
            
            # Generate summary based on type
            if summary_type == "extractive":
                summary = self._extractive_summary(full_text, max_sentences)
            else:
                summary = self._abstractive_summary(full_text, topic)
            
            if progress_callback:
                progress_callback("Extracting key points...", 80)
            
            # Extract key points
            key_points = self._extract_key_points(full_text, topic)
            
            if progress_callback:
                progress_callback("Calculating statistics...", 90)
            
            # Calculate statistics
            stats = self._calculate_text_statistics(full_text, summary)
            
            if progress_callback:
                progress_callback("Summarization completed!", 100)
            
            return {
                'summary': summary,
                'key_points': key_points,
                'topic': topic,
                'summary_type': summary_type,
                'statistics': stats,
                'word_count': len(summary.split()),
                'original_word_count': len(full_text.split())
            }
            
        except Exception as e:
            logger.error(f"Summarization failed: {str(e)}")
            raise SummarizationError(f"Failed to generate summary: {str(e)}")
    
    def _extract_text_from_transcript(self, transcript: Dict[str, Any]) -> str:
        """Extract full text from transcript segments"""
        if not transcript or 'segments' not in transcript:
            return ""
        
        text_segments = []
        for segment in transcript['segments']:
            if 'text' in segment:
                text_segments.append(segment['text'].strip())
        
        return " ".join(text_segments)
    
    def _extractive_summary(self, text: str, max_sentences: int) -> str:
        """Generate extractive summary using frequency-based scoring"""
        try:
            # Tokenize sentences
            sentences = sent_tokenize(text)
            
            if len(sentences) <= max_sentences:
                return text
            
            # Calculate word frequencies
            words = word_tokenize(text.lower())
            words = [word for word in words if word.isalnum() and word not in self.stop_words]
            
            word_freq = {}
            for word in words:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            # Score sentences based on word frequencies
            sentence_scores = []
            for i, sentence in enumerate(sentences):
                sentence_words = word_tokenize(sentence.lower())
                sentence_words = [word for word in sentence_words if word.isalnum() and word not in self.stop_words]
                
                score = 0
                for word in sentence_words:
                    score += word_freq.get(word, 0)
                
                # Normalize by sentence length
                if len(sentence_words) > 0:
                    score = score / len(sentence_words)
                
                sentence_scores.append((score, i))
            
            # Get top sentences
            top_sentences = sorted(sentence_scores, reverse=True)[:max_sentences]
            
            # Sort by original order
            top_sentence_indices = sorted([idx for score, idx in top_sentences])
            
            # Generate summary
            summary_sentences = [sentences[idx] for idx in top_sentence_indices]
            
            return " ".join(summary_sentences)
            
        except Exception as e:
            logger.warning(f"Extractive summarization failed: {str(e)}")
            # Fallback to simple truncation
            sentences = sent_tokenize(text)
            return " ".join(sentences[:max_sentences])
    
    def _abstractive_summary(self, text: str, topic: Optional[str] = None) -> str:
        """Generate topic-focused extractive summary"""
        sentences = sent_tokenize(text)
        
        if topic:
            # Filter sentences related to topic
            topic_words = set(word.lower() for word in topic.split())
            topic_sentences = []
            
            for sentence in sentences:
                sentence_words = set(word.lower() for word in word_tokenize(sentence))
                if topic_words.intersection(sentence_words):
                    topic_sentences.append(sentence)
            
            if topic_sentences:
                sentences = topic_sentences[:5]
            else:
                sentences = sentences[:5]
        else:
            sentences = sentences[:5]
        
        return " ".join(sentences)
    
    def _extract_key_points(self, text: str, topic: Optional[str] = None) -> List[str]:
        """Extract key points from text"""
        try:
            sentences = sent_tokenize(text)
            
            # Simple key point extraction based on sentence importance
            key_points = []
            
            for sentence in sentences[:10]:  # Check first 10 sentences
                # Simple heuristics for importance
                if (len(sentence.split()) > 10 and 
                    any(indicator in sentence.lower() for indicator in 
                        ['important', 'key', 'main', 'primary', 'significant', 'crucial'])):
                    key_points.append(sentence)
                elif len(key_points) < 3:
                    key_points.append(sentence)
            
            return key_points[:5]  # Return top 5 key points
            
        except Exception as e:
            logger.warning(f"Key point extraction failed: {str(e)}")
            return ["Unable to extract key points"]
    
    def _calculate_text_statistics(self, original_text: str, summary: str) -> Dict[str, Any]:
        """Calculate text statistics"""
        try:
            original_words = word_tokenize(original_text)
            summary_words = word_tokenize(summary)
            
            return {
                'original_sentences': len(sent_tokenize(original_text)),
                'summary_sentences': len(sent_tokenize(summary)),
                'original_words': len(original_words),
                'summary_words': len(summary_words),
                'compression_ratio': len(summary_words) / len(original_words) if original_words else 0,
                'unique_words': len(set(original_words)),
                'avg_sentence_length': np.mean([len(sent.split()) for sent in sent_tokenize(original_text)])
            }
            
        except Exception as e:
            logger.warning(f"Statistics calculation failed: {str(e)}")
            return {}
    
    def _generate_empty_summary(self) -> Dict[str, Any]:
        """Generate empty summary when no text is available"""
        return {
            'summary': 'No transcript available for summarization.',
            'key_points': ['No content to summarize'],
            'topic': None,
            'summary_type': 'extractive',
            'statistics': {},
            'word_count': 0,
            'original_word_count': 0
        }

class SummarizationError(Exception):
    """Custom exception for summarization errors"""
    pass
