/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    onRegenerate?: (caption: string) => void;
    onRemix?: (caption: string, prompt: string) => void;
    onDownload?: (caption: string) => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ onRegenerate, caption }: {onRegenerate?: (caption: string) => void, caption: string}) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-neutral-500">Algo correu mal.</p>
        {onRegenerate && (
            <button 
                onClick={() => onRegenerate(caption)}
                className="mt-4 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 px-3 py-1 rounded-full transition-colors"
            >
                Tentar Novamente
            </button>
        )}
    </div>
);

const Placeholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-bold text-xl uppercase tracking-wider">Carregar Foto</span>
    </div>
);

const RemixForm = ({ onRemix, caption }: { onRemix: (caption: string, prompt: string) => void, caption: string }) => {
    const [prompt, setPrompt] = useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (prompt.trim()) {
            onRemix(caption, prompt.trim());
        }
    };
    return (
        <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/70 to-transparent z-30"
            onClick={(e) => e.stopPropagation()} // Prevent card drag
        >
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input 
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="ex: torná-lo mais curto..."
                    className="w-full bg-white/10 text-white placeholder-neutral-400 text-sm rounded-md px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                 <button type="submit" className="bg-yellow-400 text-black font-bold uppercase tracking-wider text-sm px-4 py-2 rounded-md hover:bg-yellow-300 transition-colors transform hover:scale-105">
                    Ir
                </button>
            </form>
        </motion.div>
    );
}

const PolaroidCard: React.FC<PolaroidCardProps> = ({ imageUrl, caption, status, error, onRegenerate, onRemix, onDownload }) => {
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isRemixing, setIsRemixing] = useState(false);

    // Reset states when the image URL changes or status goes to pending.
    useEffect(() => {
        if (status === 'pending') {
            setIsDeveloped(false);
            setIsImageLoaded(false);
            setIsRemixing(false); // Close remix input on regenerate
        }
        if (status === 'done' && imageUrl) {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
    }, [imageUrl, status]);

    // When the image is loaded, start the developing animation.
    useEffect(() => {
        if (isImageLoaded) {
            const timer = setTimeout(() => {
                setIsDeveloped(true);
            }, 200); // Short delay before animation starts
            return () => clearTimeout(timer);
        }
    }, [isImageLoaded]);

    const handleRemix = () => {
        if (onRemix) {
            setIsRemixing(!isRemixing);
        }
    };

    const handleRemixSubmit = (decade: string, prompt: string) => {
        setIsRemixing(false);
        onRemix?.(decade, prompt);
    };

    return (
        <div className="bg-neutral-100 dark:bg-neutral-100 !p-4 !pb-16 flex flex-col items-center justify-start aspect-[3/4] w-80 max-w-full rounded-md shadow-lg relative">
             <div className="w-full bg-neutral-900 shadow-inner flex-grow relative overflow-hidden group">
                {status === 'pending' && <LoadingSpinner />}
               {status === 'error' && (
  <div className="relative w-full h-full">
    {imageUrl && (
      <img
        src={imageUrl}
        alt={caption}
        className="w-full h-full object-cover"
      />
    )}
    <ErrorDisplay onRegenerate={onRegenerate} caption={caption} />
  </div>
)}

                {status === 'done' && imageUrl && (
                    <>
                        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {onDownload && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDownload(caption); }}
                                    className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Descarregar imagem para ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                             {onRegenerate && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRegenerate(caption); }}
                                    className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Gerar nova imagem para ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            {onRemix && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemix(); }}
                                    className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Modificar imagem para ${caption}`}
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.293 2.293a1 1 0 00-1.414 0l-1.06 1.06a1 1 0 000 1.414l4.242 4.242a1 1 0 001.414 0l1.06-1.06a1 1 0 000-1.414l-4.242-4.242zM13.586 7.586l-4.242-4.242a1 1 0 00-1.414 0L.293 10.975a1 1 0 000 1.414l4.242 4.242a1 1 0 001.414 0l7.63-7.63a1 1 0 000-1.414zM8.586 12.586l-2-2a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414-1.414zM11 5.5a.5.5 0 00-.5-.5h-1a.5.5 0 000 1h1a.5.5 0 00.5-.5zM5.5 11a.5.5 0 00-.5-.5h-1a.5.5 0 000 1h1a.5.5 0 00.5-.5zM3 13.5a.5.5 0 00-.5-.5h-1a.5.5 0 000 1h1a.5.5 0 00.5-.5z" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* The developing chemical overlay - fades out */}
                        <div
                            className={`absolute inset-0 z-10 bg-[#3a322c] transition-opacity duration-[3500ms] ease-out ${
                                isDeveloped ? 'opacity-0' : 'opacity-100'
                            }`}
                            aria-hidden="true"
                        />
                        
                        {/* The Image - fades in and color corrects */}
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
                                isDeveloped 
                                ? 'opacity-100 filter-none' 
                                : 'opacity-80 filter sepia(1) contrast(0.8) brightness(0.8)'
                            }`}
                            style={{ opacity: isImageLoaded ? undefined : 0 }}
                        />
                        <AnimatePresence>
                            {isRemixing && <RemixForm onRemix={handleRemixSubmit} caption={caption} />}
                        </AnimatePresence>
                    </>
                )}
                {status === 'done' && !imageUrl && <Placeholder />}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                <p className={cn(
                    "font-bold text-lg truncate",
                    status === 'done' && imageUrl ? 'text-black' : 'text-neutral-800'
                )}>
                    {caption}
                </p>
            </div>
        </div>
    );
};

export default PolaroidCard;
