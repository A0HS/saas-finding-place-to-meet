export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <a
            href="https://kgpt.or.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:text-blue-300 transition-colors"
          >
            한국GPT협회
          </a>
          <span className="text-gray-500">|</span>
          <a href="tel:02-562-1552" className="hover:text-white transition-colors">
            02-562-1552
          </a>
          <span className="text-gray-500">|</span>
          <a href="mailto:GPT@Rnbdp.com" className="hover:text-white transition-colors">
            GPT@Rnbdp.com
          </a>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
          개발자 : 안현수
        </div>
      </div>
    </footer>
  );
}
