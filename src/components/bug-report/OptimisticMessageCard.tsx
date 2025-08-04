import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import ImageModal from './ImageModal';

type OptimisticMessageCardProps = {
  selectedFiles: File[];
  loading: boolean;
  message: string;
  selectedContact: {
    company: {
      name: string;
      image?: string;
    };
  };
};

const OptimisticMessageCard: React.FC<OptimisticMessageCardProps> = ({
  loading,
  selectedContact,
  message,
  selectedFiles,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const isCompany = false;
  const avatarSrc = isCompany
    ? selectedContact.company.image || '/placeholder.svg'
    : '';
  const displayName = isCompany ? selectedContact.company.name : 'AX';

  const formattedDate = new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`flex items-start ${
        !loading ? 'flex-row space-x-2' : 'flex-row-reverse gap-2'
      }`}
    >
      <Avatar className="mt-1 h-8 w-8">
        <AvatarImage src={avatarSrc} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        {/* Attachment Section */}
        {selectedFiles?.length > 0 && (
          <div
            className={`mb-2 flex flex-wrap gap-2 ${
              !loading ? 'justify-start' : 'justify-end'
            }`}
          >
            {selectedFiles.map((attachment: File, index) => {
              return (
                <div key={index}>
                  {
                    <Image
                      src={URL.createObjectURL(attachment)}
                      alt={attachment.name}
                      className="aspect-auto cursor-pointer rounded-sm border"
                      width={200}
                      height={200}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setIsModalOpen(true);
                        // setIsImageLoading(true);
                      }}
                    />
                  }
                </div>
              );
            })}
          </div>
        )}

        {/* Message Bubble */}
        {message && (
          <div
            className={`group relative max-w-full rounded-xl p-3 text-sm shadow-md ${
              !loading
                ? 'me-[20%] bg-white text-gray-800'
                : 'ms-[20%] bg-[#006D77] text-white'
            }`}
          >
            <p className="whitespace-pre-line break-words">{message}</p>
          </div>
        )}

        {/* Time + Read Status */}
        <div
          className={`mt-1 flex items-center ${
            !loading ? 'justify-start' : 'justify-end'
          } text-xs opacity-70`}
        >
          <span>{formattedDate}</span>
          {/* Show read status only for messages sent by current viewer */}
          {loading && (
            <span className={`ml-2 ${!loading ? 'text-blue-500' : ''}`}>
              {!loading ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ImageModal
          currentImageIndex={currentImageIndex}
          isOptimistic={true}
          selectedFiles={selectedFiles}
          setCurrentImageIndex={setCurrentImageIndex}
          setIsModalOpen={setIsModalOpen}
          isImageLoading={isImageLoading}
          isModalOpen={isModalOpen}
          setIsImageLoading={setIsImageLoading}
        />
      )}
    </div>
  );
};

export default OptimisticMessageCard;
