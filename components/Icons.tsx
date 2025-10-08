import React from 'react';

// Using a generic Icon component to avoid repeating SVG props
const Icon: React.FC<{ children: React.ReactNode; className?: string; fill?: string }> = ({ children, className, fill = "none" }) => (
    <svg 
        className={className || "h-6 w-6"} 
        fill={fill}
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        // heroicons pattern: stroke width is 0 if fill is used
        strokeWidth={fill === 'none' ? 1.5 : 0} // Using 1.5 for a more modern look
    >
        {children}
    </svg>
);


export const ChartPieIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </Icon>
);

export const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </Icon>
);

export const CogIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0s-1.5-3.375-1.5-6c0-3.038 2.09-5.5 5-5.5s5 2.462 5 5.5c0 2.625-1.5 6-1.5 6m-1.5-6a3 3 0 11-6 0 3 3 0 016 0z" />
    </Icon>
);

export const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25V5.25A2.25 2.25 0 013.75 3h5.25a2.25 2.25 0 012.25 2.25V9.75m-16.5 0a2.25 2.25 0 00-2.25 2.25v3.75a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25v-3.75a2.25 2.25 0 00-2.25-2.25H3.75z" />
    </Icon>
);

export const FolderOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0A2.25 2.25 0 016 7.5h1.5m9 0h1.5a2.25 2.25 0 012.25 2.25m-16.5 0v1.5A2.25 2.25 0 006 13.5h12a2.25 2.25 0 002.25-2.25V9.75" />
    </Icon>
);

export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </Icon>
);

export const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.598M12 14.25a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5z" />
    </Icon>
);

export const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </Icon>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </Icon>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </Icon>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </Icon>
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </Icon>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </Icon>
);

export const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </Icon>
);

export const DotsVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </Icon>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className} fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </Icon>
);

export const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className} fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 00-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
    </Icon>
);

export const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </Icon>
);

export const DrillIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 L8 21 H16 L12 3 Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 C 14.5 9, 9.5 15, 12 21" />
    </Icon>
);

export const PhotographIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" />
    </Icon>
);

export const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </Icon>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </Icon>
);

export const CollectionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </Icon>
);

export const PencilAltIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </Icon>
);

export const EraserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h12.75" />
    </Icon>
);

export const DocumentAddIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
);

export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </Icon>
);

export const DocumentDownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </Icon>
);

export const TableIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V6.375m1.125 13.125A1.125 1.125 0 004.5 18.375h15a1.125 1.125 0 001.125-1.125V6.375m-17.25 0h17.25m-17.25 0A1.125 1.125 0 012.25 5.25h19.5a1.125 1.125 0 011.125 1.125v12a1.125 1.125 0 01-1.125 1.125h-19.5a1.125 1.125 0 01-1.125-1.125v-12z" />
    </Icon>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Icon>
);

export const InformationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.25 22.5l-.648-1.947a3.375 3.375 0 00-2.456-2.456L11.25 18l1.947-.648a3.375 3.375 0 002.455-2.456L16.25 13l.648 1.947a3.375 3.375 0 002.456 2.455l1.947.648-1.947.648a3.375 3.375 0 00-2.455 2.456z" />
    </Icon>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </Icon>
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </Icon>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
    </Icon>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
);

export const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </Icon>
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </Icon>
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </Icon>
);

export const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
    </Icon>
);

export const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
    </Icon>
);

export const AuditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <ClipboardListIcon className={className} />
);

export const RectangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
    </Icon>
);

export const OvalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
         <ellipse cx="12" cy="12" rx="10" ry="7" strokeWidth={2} />
    </Icon>
);

export const DiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L22 12 12 22 2 12 12 2z" />
    </Icon>
);

export const ResizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </Icon>
);

export const BoldIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    </svg>
);

export const ItalicIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line>
    </svg>
);

export const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.124-.08C12.154 3.663 13.5 4.86 13.5 6.375v1.125m-3.375 0h1.5m-1.5 0c-1.012 0-1.867.668-2.15 1.586m5.8 0c.065-.21.1-.433.1-.664 0-.414-.336-.75-.75-.75h-4.5a.75.75 0 00-.75.75c0 .231.035.454.1.664M6.75 7.5h-1.5a2.25 2.25 0 00-2.25 2.25v7.5c0 1.242 1.008 2.25 2.25 2.25h9.75a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-1.5" />
    </Icon>
);


// --- New Flowchart Icons ---
export const ParallelogramIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 18L8 6h12l-4 12H4z" />
    </Icon>
);

export const PredefinedProcessIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 5h20v14H2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 5v14M18 5v14" />
    </Icon>
);

export const FlowchartDocumentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v11c0 4-4 5-8 5s-8-1 -8-5V4z" />
    </Icon>
);

export const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <ellipse cx="12" cy="6" rx="8" ry="4" strokeWidth={1.5} />
        <path d="M4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6" strokeWidth={1.5} />
    </Icon>
);

export const CircleIcon: React.FC<{ className?: string }> = ({ className }) => (
   <Icon className={className}>
       <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
   </Icon>
);

export const SelectionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" d="M3 8V4h4m10 0h4v4M3 16v4h4m10 0h4v-4" />
    </Icon>
);

export const RotateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.364 5.636l1.414 1.414-1.414-1.414zM19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.707 10.293a1 1 0 00-1.414-1.414l-1.414 1.414a1 1 0 001.414 1.414l1.414-1.414zM12 5v.01" />
    </Icon>
);

export const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className} fill="none">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.182m-3.181-4.991l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.182" />
    </Icon>
);