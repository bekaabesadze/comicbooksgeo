'use client';

import { useLanguage } from "@/context/LanguageContext";
import Link from 'next/link';
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Code, ExternalLink } from 'lucide-react';

export default function Portfolio() {
    const { language, t } = useLanguage();
    const isKa = language === 'ka';

    return (
        <main className="min-h-screen bg-[#080c14] text-white p-6 md:p-16 lg:p-24 font-sans selection:bg-blue-500/30">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="text-white/40 hover:text-white mb-8 md:mb-12 inline-block transition-colors text-sm font-bold tracking-widest uppercase"
                >
                    {t.backToLibrary || "← Back"}
                </Link>

                {/* Header */}
                <header className="mb-16 border-b border-white/10 pb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase">
                            {isKa ? 'ბექა აბესაძე' : 'Beka Abesadze'}
                        </h1>
                        <h2 className="text-xl md:text-2xl text-blue-200/70 tracking-widest uppercase font-bold">
                            {isKa ? 'პროგრამული უზრუნველყოფის დეველოპერი' : 'Software Developer'}
                        </h2>
                    </div>

                    <div className="flex flex-col gap-3 text-sm text-white/60 font-medium">
                        <a href="mailto:bekaabesadze007@gmail.com" className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                            <Mail className="w-4 h-4" /> bekaabesadze007@gmail.com
                        </a>
                        <a href="tel:+17183064339" className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                            <Phone className="w-4 h-4" /> +1 718 306 4339
                        </a>
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4" /> {isKa ? 'დეკორა 52101, აშშ' : 'Decorah 52101, United States'}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                    {/* Main Content (Left Column on Desktop) */}
                    <div className="md:col-span-2 space-y-16">

                        {/* Profile Section */}
                        <section>
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="w-8 h-px bg-blue-500/50" />
                                {isKa ? 'პროფილი' : 'Profile'}
                            </h3>
                            <p className="text-lg text-white/70 leading-relaxed">
                                {isKa ? (
                                    <>
                                        პროფესიონალი <strong>iOS დეველოპერი</strong>, რომელსაც აქვს საწარმოო დონის (production-level) iOS აპლიკაციების დიზაინის, შექმნისა და განთავსების პრაქტიკული გამოცდილება. <strong>Luther College</strong>-ის ოფიციალური აპლიკაციის ავტორი. სასტუმრო სურამის iOS აპლიკაციის შემქმნელი, სადაც ძირითადი აქცენტი გაკეთებულია სუფთა UI/UX-ზე, წარმადობასა და რეალურ გამოყენებადობაზე. ვფლობ Apple-ის განვითარების ეკოსისტემას, მათ შორის Swift, Xcode და iOS ფრეიმვორკებს, ძლიერი ფოკუსირებით მასშტაბირებად და მომხმარებელზე ორიენტირებულ გადაწყვეტილებებზე.
                                    </>
                                ) : (
                                    <>
                                        Professional <strong>iOS Developer</strong> with hands-on experience designing, building, and deploying production-level iOS applications. Creator of an official app for <strong>Luther College</strong>. Creator of a hotel iOS application for Hotel Surami, emphasizing clean UI/UX, performance, and real-world usability. Proficient in Apple's development ecosystem, including Swift, Xcode and iOS frameworks, with a strong focus on scalable, user-centered solutions.
                                    </>
                                )}
                            </p>
                        </section>

                        {/* Experience Section */}
                        <section>
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="w-8 h-px bg-blue-500/50" />
                                {isKa ? 'გამოცდილება ინდუსტრიაში' : 'Internships & Experience'}
                            </h3>

                            <div className="space-y-12">
                                <div className="relative pl-6 border-l-2 border-white/10">
                                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#080c14]" />
                                    <h4 className="text-xl font-bold text-white mb-1">
                                        {isKa ? 'Software Developer - Luther College' : 'Software Developer at Luther College'}
                                    </h4>
                                    <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">
                                        {isKa ? 'დეკორა, აიოვა | იანვარი 2026 - დღემდე' : 'Decorah, Iowa | Jan 2026 — Present'}
                                    </p>
                                    <p className="text-white/70 leading-relaxed">
                                        {isKa ?
                                            'დამოუკიდებლად შევქმენი და განვათავსე საწარმოო დონის iOS აპლიკაცია Luther College-სთვის, მორგებული ბექენდის გამოყენებით რეალურ დროში პოსტებისთვის, რეაქციებისთვის, სპორტული მოვლენების განახლებებისა და სტუდენტური კომუნიკაციებისთვის. ვუზრუნველყოფ აპლიკაციის სრულ არქიტექტურას, ბექენდის ინტეგრაციასა და დეპლოიმენტს სხვა დეველოპერული გუნდის დახმარების გარეშე.' :
                                            'Independently developed and deployed a production-level iOS application for Luther College, including a custom backend for real-time posts, reactions, sports event updates, and student communication. Owned full app architecture, backend integration, and deployment without a development team.'
                                        }
                                    </p>
                                </div>

                                <div className="relative pl-6 border-l-2 border-white/10">
                                    <div className="absolute w-3 h-3 bg-neutral-600 rounded-full -left-[7px] top-1.5 ring-4 ring-[#080c14]" />
                                    <h4 className="text-xl font-bold text-white mb-1">
                                        {isKa ? 'Software Developer - Hotel Surami' : 'Software Developer at Hotel Surami'}
                                    </h4>
                                    <p className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4">
                                        {isKa ? 'თბილისი, საქართველო | ივნისი 2025 - აგვისტო 2025' : 'Tbilisi, Georgia | Jun 2025 — Aug 2025'}
                                    </p>
                                    <p className="text-white/70 leading-relaxed">
                                        {isKa ?
                                            'დამოუკიდებლად დავაპროექტე, შევქმენი და განვათავსე სასტუმრო "სურამის" ნატიური (native) iOS აპლიკაცია სრულიად განახლებული მობილური გამოცდილების უზრუნველსაყოფად, რომელიც სტუმრებს სთავაზობს სასტუმროს ნათელ ინფორმაციასა და ადგილობრივ რესურსებს.' :
                                            'Independently designed, developed, and deployed a native iOS application for Hotel Surami, delivering a streamlined mobile experience that provides guests with clear, accessible hotel information and on-site resources.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Sidebar Content (Right Column on Desktop) */}
                    <div className="space-y-12">

                        {/* Education Section */}
                        <section>
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="w-8 h-px bg-blue-500/50" />
                                {isKa ? 'განათლება' : 'Education'}
                            </h3>
                            <div className="space-y-8">
                                <div>
                                    <h4 className="font-bold text-white mb-1">
                                        {isKa ? 'ბაკალავრის ხარისხი' : 'Bachelors Degree'}
                                    </h4>
                                    <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Luther College, Decorah <br /> {isKa ? 'სექ. 2024 - დღემდე' : 'Sept 2024 — Present'}</p>
                                    <ul className="text-white/70 text-sm space-y-2 list-disc pl-4 marker:text-blue-500">
                                        <li>{isKa ? 'დეკანის სია (Dean\'s list)' : 'Member of Dean\'s list'}</li>
                                        <li>{isKa ? 'Alpha Lambda Delta საპატიო საზოგადოების წევრი' : 'Member of Alpha Lambda Delta honor society'}</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">
                                        {isKa ? 'საშუალო სკოლის დიპლომი' : 'High school diploma'}
                                    </h4>
                                    <p className="text-white/50 text-xs uppercase tracking-widest mb-3">ALBION, Tbilisi <br /> {isKa ? 'სექ. 2011 - მაისი 2024' : 'Sept 2011 — May 2024'}</p>
                                    <ul className="text-white/70 text-sm space-y-2 list-disc pl-4 marker:text-blue-500">
                                        <li>4.0 GPA</li>
                                        <li>{isKa ? 'კურსდამთავრებული ოქროს მედლით' : 'Graduated with a golden medal of honor'}</li>
                                        <li>{isKa ? 'სკოლის ვიცე-პრეზიდენტი' : 'School vice president'}</li>
                                        <li>{isKa ? 'კალათბურთის & ფრენბურთის გუნდების კაპიტანი' : 'Basketball & Volleyball teams'}</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Certificates */}
                        <section>
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="w-8 h-px bg-blue-500/50" />
                                {isKa ? 'სერთიფიკატები' : 'Certifications'}
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex flex-col gap-1">
                                    <span className="font-bold text-white text-sm">Data Analytics</span>
                                    <span className="text-xs text-white/50 uppercase tracking-widest">Google</span>
                                </li>
                                <li className="flex flex-col gap-1">
                                    <span className="font-bold text-white text-sm">Technical Support Fundamentals</span>
                                    <span className="text-xs text-white/50 uppercase tracking-widest">Google</span>
                                </li>
                                <li className="flex flex-col gap-1">
                                    <span className="font-bold text-white text-sm">Comprehensive Programming (Web, Mobile, Game)</span>
                                    <span className="text-xs text-white/50 uppercase tracking-widest">It Step Academy</span>
                                </li>
                                <li className="flex flex-col gap-1">
                                    <span className="font-bold text-white text-sm">Programming Course (C#, .NET & JS)</span>
                                    <span className="text-xs text-white/50 uppercase tracking-widest">It Step Academy</span>
                                </li>
                            </ul>
                        </section>

                        {/* Skills */}
                        <section>
                            <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="w-8 h-px bg-blue-500/50" />
                                {isKa ? 'უნარები' : 'Skills'}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['Xcode (iOS)', 'Swift', 'Website Development', 'React / Next.js', 'C# / .NET', 'JavaScript', 'Visual Studio', 'Adobe Photoshop', 'Adobe Illustrator'].map(skill => (
                                    <span key={skill} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:bg-white/10 hover:border-white/20 transition-colors cursor-default">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>

                    </div>
                </div>

            </div>
        </main>
    );
}
