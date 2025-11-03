import React from 'react';
import { Content, ContentType } from '../types';
import { DocumentTextIcon, PhotographIcon, LinkIcon, TrashIcon, CollectionIcon } from './Icons';
import Spinner from './Spinner';

interface ContentListProps {
    contentItems: Content[];
    onDelete: (id: string) => void;
    isLoading: boolean;
}

const ContentIcon: React.FC<{ type: ContentType }> = ({ type }) => {
    switch (type) {
        case ContentType.TEXT:
            return <DocumentTextIcon className="h-6 w-6 text-blue-500" />;
        case ContentType.IMAGE:
            return <PhotographIcon className="h-6 w-6 text-green-500" />;
        case ContentType.LINK:
            return <LinkIcon className="h-6 w-6 text-purple-500" />;
        default:
            return null;
    }
};

const ContentPreview: React.FC<{ item: Content }> = ({ item }) => {
    switch (item.type) {
        case ContentType.TEXT:
            return <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate">{item.data}</p>;
        case ContentType.IMAGE:
            return <img src={item.data} alt={item.title} className="w-16 h-10 object-cover rounded" />;
        case ContentType.LINK:
            return <a href={item.data} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{item.data}</a>;
        default:
            return null;
    }
};

const ContentList: React.FC<ContentListProps> = ({ contentItems, onDelete, isLoading }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md h-full">
            <h2 className="text-xl font-bold mb-4">Generated Content</h2>
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Spinner />
                        <span className="ml-2">Loading Content...</span>
                    </div>
                ) : contentItems.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {contentItems.map(item => (
                            <li key={item.id} className="py-3 flex items-center justify-between">
                                <div className="flex items-center min-w-0">
                                    <div className="flex-shrink-0">
                                        <ContentIcon type={item.type} />
                                    </div>
                                    <div className="ml-4 min-w-0">
                                        <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{item.title}</p>
                                        <div className="max-w-xs">
                                            <ContentPreview item={item} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                                    aria-label={`Delete ${item.title}`}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                        <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No Content Yet</h3>
                        <p className="mt-1 text-sm">Create some content to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentList;
