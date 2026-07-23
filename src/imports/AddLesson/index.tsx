import svgPaths from "./svg-2dsjd4j72g";
import imgEllipse111 from "./bd1cc29f58a627dc97d33b4c98de6c668cd82bdc.png";

function Group1() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-[10px] mt-0 place-items-start relative row-1">
      <div className="col-1 ml-0 mt-[1.09px] relative row-1 size-[15.81px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.81 15.81">
          <ellipse cx="7.905" cy="7.905" fill="var(--fill-0, #955AC3)" id="Ellipse 109" rx="7.905" ry="7.905" />
        </svg>
      </div>
      <p className="[word-break:break-word] col-1 font-['Jost:Bold',sans-serif] font-bold h-[15.975px] leading-[normal] ml-[4.56px] mt-0 relative row-1 text-[12.286px] text-center text-white w-[6.212px]">1</p>
    </div>
  );
}

function Group9() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <div className="col-1 ml-0 mt-[5px] relative row-1 size-[24px]" data-name="Icons/Basic/Bell + Notification">
        <div className="absolute inset-[10%_17.5%]" data-name="Bell">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.6 19.2">
            <path d={svgPaths.p28f42970} fill="var(--fill-0, #0E1B4A)" id="Bell" />
          </svg>
        </div>
      </div>
      <Group1 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Poppins:Medium',sans-serif] items-start leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[12px] w-[137px]">
      <p className="relative shrink-0 w-full" dir="auto">
        john doe
      </p>
      <p className="relative shrink-0 w-full">J.doe2541@gmail.com</p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <div className="relative shrink-0 size-[37.611px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="37.611" src={imgEllipse111} width="37.611" />
      </div>
      <Frame11 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="absolute content-stretch flex gap-[12px] items-start left-[951px] top-[21px]">
      <Group9 />
      <Frame12 />
    </div>
  );
}

function Group7() {
  return (
    <div className="absolute contents left-[287px] top-[140px]">
      <div className="absolute bg-white h-[706px] left-[287px] rounded-[12px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.1)] top-[140px] w-[1109px]" />
    </div>
  );
}

function Frame15() {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[348px] top-[162px]">
      <div className="flex items-center justify-center relative shrink-0 size-[24.327px]">
        <div className="flex-none rotate-[179.21deg]">
          <button className="block cursor-pointer relative size-[24px]" data-name="Icons/Basic/Arrow-Right 3">
            <div className="absolute inset-[21.25%_29.7%_21.25%_36.25%]" data-name="Arrow-Right">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.17279 13.8">
                <path clipRule="evenodd" d={svgPaths.p23f7b300} fill="var(--fill-0, #3F434A)" fillRule="evenodd" id="Arrow-Right" />
              </svg>
            </div>
          </button>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[26px] text-center whitespace-nowrap">Add Lesson</p>
    </div>
  );
}

function Group6() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="[word-break:break-word] col-1 font-['Poppins:Medium',sans-serif] leading-[normal] ml-0 mt-0 not-italic relative row-1 text-[#999] text-[12px] whitespace-nowrap">Lesson 1</p>
    </div>
  );
}

function Calendar() {
  return (
    <div className="absolute inset-[10%_10%_9.98%_10%]" data-name="Calendar">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.4 14.4035">
        <g id="Calendar">
          <path clipRule="evenodd" d={svgPaths.p30fed200} fill="var(--fill-0, #999999)" fillRule="evenodd" id="Union" />
          <path clipRule="evenodd" d={svgPaths.p3dc55900} fill="var(--fill-0, #999999)" fillRule="evenodd" id="Union_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-[1_0_0] h-full items-center justify-between min-w-px relative">
      <Group6 />
      <div className="relative shrink-0 size-[18px]" data-name="Icons/Basic/Calendar">
        <Calendar />
      </div>
    </div>
  );
}

function InputField() {
  return (
    <div className="absolute bg-white inset-[32.35%_0_1.47%_0] rounded-[8px]" data-name="Input Field">
      <div className="content-stretch flex items-center overflow-clip px-[16px] py-[5px] relative rounded-[inherit] size-full">
        <Frame />
      </div>
      <div aria-hidden className="absolute border-[#f2f4f7] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function PlaceHolder() {
  return (
    <div className="absolute content-stretch flex inset-[0_71.98%_70.59%_0] items-center pb-[2px] px-[2px]" data-name="Place Holder">
      <p className="[word-break:break-word] font-['Poppins:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[16px] whitespace-nowrap">Lesson Name</p>
    </div>
  );
}

function MdiRequired({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[13px]"} data-name="mdi:required">
      <div className="absolute inset-[12.5%]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.75 9.75">
          <path d={svgPaths.p85f5500} fill="var(--fill-0, #FF1C1C)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="absolute content-stretch flex gap-[10px] h-[72px] items-start justify-end left-[348px] px-[11px] py-[4px] top-[281px] w-[305px]">
      <div className="absolute drop-shadow-[0px_0px_1px_rgba(0,0,0,0.12)] h-[72px] left-0 top-0 w-[305px]" data-name="Input">
        <InputField />
        <PlaceHolder />
      </div>
      <MdiRequired />
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex h-[272px] items-center justify-center px-[108px] py-[86px] relative rounded-[12px] shrink-0 w-[263px]">
      <div aria-hidden className="absolute border-[#955ac3] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <button className="block cursor-pointer h-[60px] overflow-clip relative shrink-0 w-[67px]" data-name="upload-01">
        <div className="absolute inset-[12.5%]" data-name="Icon">
          <div className="absolute inset-[-1.67%_-1.49%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 51.75 46.5">
              <path d={svgPaths.p2fae4920} id="Icon" stroke="var(--stroke-0, #955AC3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex h-[272px] items-center justify-center px-[108px] py-[86px] relative rounded-[12px] shrink-0 w-[263px]">
      <div aria-hidden className="absolute border-[#955ac3] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#955ac3] text-[26px] whitespace-nowrap">Pdf</p>
    </div>
  );
}

function Frame18() {
  return (
    <div className="absolute content-stretch flex gap-[80px] items-center left-[515px] top-[393px]">
      <Frame17 />
      <Frame10 />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute inset-[3.8%_9.8%_94.17%_82.75%]" data-name="Group">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 20.8015">
        <g id="Group">
          <g id="Vector" />
          <path d={svgPaths.p3a2d5500} fill="var(--fill-0, #0E1B4A)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Group3() {
  return (
    <div className="col-1 h-[29.569px] ml-0 mt-0 relative row-1 w-[30.951px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 30.9506 29.5693">
        <g id="Group 14">
          <g id="Group 13">
            <path d={svgPaths.p111d0c00} fill="var(--fill-0, #955AC3)" id="Vector" />
            <path d={svgPaths.p28b03b80} fill="var(--fill-0, #955AC3)" id="Vector_2" />
            <path d={svgPaths.pedaba00} fill="var(--fill-0, #FFDD55)" id="Vector_3" />
          </g>
          <path d={svgPaths.p26136b40} fill="var(--fill-0, #955AC3)" id="Vector_4" />
        </g>
      </svg>
    </div>
  );
}

function Group4() {
  return (
    <div className="col-1 h-[15.161px] ml-[37.45px] mt-[8.03px] relative row-1 w-[108.551px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 108.551 15.1605">
        <g id="Group 15">
          <path d={svgPaths.p820b400} fill="var(--fill-0, #0E1B4A)" id="Vector" />
          <path d={svgPaths.p3eb1d000} fill="var(--fill-0, #0E1B4A)" id="Vector_2" />
          <path d={svgPaths.p5129190} fill="var(--fill-0, #0E1B4A)" id="Vector_3" />
          <path d={svgPaths.p1c954f80} fill="var(--fill-0, #0E1B4A)" id="Vector_4" />
          <path d={svgPaths.p3c5f8f70} fill="var(--fill-0, #0E1B4A)" id="Vector_5" />
          <path d={svgPaths.p3ab21800} fill="var(--fill-0, #0E1B4A)" id="Vector_6" />
          <path d={svgPaths.p23372780} fill="var(--fill-0, #0E1B4A)" id="Vector_7" />
          <path d={svgPaths.p357bd600} fill="var(--fill-0, #0E1B4A)" id="Vector_8" />
          <path d={svgPaths.p39408f80} fill="var(--fill-0, #0E1B4A)" id="Vector_9" />
          <path d={svgPaths.p9b55100} fill="var(--fill-0, #0E1B4A)" id="Vector_10" />
          <path d={svgPaths.p2a590680} fill="var(--fill-0, #FBFAFC)" id="Vector_11" />
          <path d={svgPaths.p19bc1260} fill="var(--fill-0, #FBFAFC)" id="Vector_12" />
        </g>
      </svg>
    </div>
  );
}

function Group5() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <Group3 />
      <Group4 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[20px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="home-02">
            <div className="absolute inset-[9.45%_12.5%_12.5%_12.5%]" data-name="Icon">
              <div className="absolute inset-[-5.34%_-5.56%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.0003 20.7331">
                  <path d={svgPaths.p3a3d9b80} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            Home page
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[#955ac3] h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="building-08">
            <div className="absolute inset-[8.71%_12.5%_12.5%_12.5%]" data-name="Icon">
              <div className="absolute inset-[-5.29%_-5.56%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20.9104">
                  <path d={svgPaths.p39e74300} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[18px] text-white whitespace-nowrap">Classes</p>
        </div>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="building-02">
            <div className="absolute inset-[12.5%]" data-name="Icon">
              <div className="absolute inset-[-5.56%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p21899840} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">{`Tasks & HM`}</p>
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="building-02">
            <div className="absolute inset-[12.5%]" data-name="Icon">
              <div className="absolute inset-[-5.56%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p21899840} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            Monthly Test
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="presentation-chart-01">
            <div className="absolute inset-[12.5%_8.33%]" data-name="Icon">
              <div className="absolute inset-[-5.56%_-5%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 20">
                  <path d={svgPaths.p35428340} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            Final Results
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="users-03">
            <div className="absolute inset-[12.5%_8.64%_12.5%_8.56%]" data-name="Icon">
              <div className="absolute inset-[-5.56%_-5.03%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 21.8723 20.0006">
                  <path d={svgPaths.p8d6d480} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            My Students
          </p>
        </div>
      </div>
    </div>
  );
}

function Group2() {
  return (
    <div className="col-1 ml-[15px] mt-0 relative row-1 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="Group 11">
          <circle cx="6" cy="6" fill="var(--fill-0, #955AC3)" id="Ellipse 109" r="6" />
        </g>
      </svg>
    </div>
  );
}

function Group8() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <div className="col-1 ml-0 mt-[4.5px] overflow-clip relative row-1 size-[24px]" data-name="message-dots-square">
        <div className="absolute inset-[12.5%_12.5%_10.58%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-5.42%_-5.56%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.0001 20.4597">
              <path d={svgPaths.pb75c000} id="Icon" stroke="var(--stroke-0, #0E1B4A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
      <Group2 />
      <p className="[word-break:break-word] col-1 font-['Poppins:Medium',sans-serif] leading-[normal] ml-[18px] mt-0 not-italic relative row-1 text-[8px] text-center text-white whitespace-nowrap">5</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <Group8 />
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            Ticketing System
          </p>
        </div>
      </div>
    </div>
  );
}

function Calendar1() {
  return (
    <div className="absolute inset-[10%_10%_9.98%_10%]" data-name="Calendar">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.2 19.2047">
        <g id="Calendar">
          <path clipRule="evenodd" d={svgPaths.p1a7de200} fill="var(--fill-0, #0E1B4A)" fillRule="evenodd" id="Union" />
          <path clipRule="evenodd" d={svgPaths.p3fd32570} fill="var(--fill-0, #0E1B4A)" fillRule="evenodd" id="Union_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="h-[59px] relative rounded-bl-[40px] rounded-tl-[40px] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[20px] relative size-full">
          <div className="relative shrink-0 size-[24px]" data-name="Icons/Basic/Calendar">
            <Calendar1 />
          </div>
          <p className="[word-break:break-word] font-['Poppins:SemiBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#0e1b4a] text-[18px] whitespace-nowrap" dir="auto">
            Time Table
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-end relative shrink-0 w-full">
      <Frame2 />
      <Frame1 />
      <Frame3 />
      <Frame4 />
      <Frame5 />
      <Frame6 />
      <Frame7 />
      <Frame8 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[60px] items-start left-[9px] top-[32.77px] w-[246px]">
      <Group5 />
      <Frame9 />
    </div>
  );
}

export default function AddLesson() {
  return (
    <div className="bg-[#fdfaff] relative size-full" data-name="Add lesson">
      <div className="absolute h-[80px] left-[255px] top-0 w-[1185px]" data-name="header">
        <div className="absolute bg-white inset-0 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.1)]" />
        <Frame13 />
      </div>
      <Group7 />
      <div className="absolute bg-[rgba(149,90,195,0.22)] content-stretch flex gap-[8px] h-[37px] items-center justify-center left-[1215px] px-[3px] py-[2px] rounded-[4px] top-[743px] w-[139px]" data-name="Buttons">
        <div className="overflow-clip relative shrink-0 size-[18px]" data-name="circle" />
        <div className="[word-break:break-word] flex flex-col font-['Poppins:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap">
          <p className="leading-[normal]">Buttons</p>
        </div>
        <div className="overflow-clip relative shrink-0 size-[18px]" data-name="circle" />
      </div>
      <div className="absolute content-stretch flex gap-[8px] h-[37px] items-center justify-center left-[1052px] px-[3px] py-[2px] rounded-[4px] top-[743px] w-[139px]" data-name="Buttons">
        <div className="overflow-clip relative shrink-0 size-[18px]" data-name="circle" />
        <div className="[word-break:break-word] flex flex-col font-['Poppins:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#344054] text-[16px] text-center whitespace-nowrap">
          <p className="leading-[normal]">Buttons</p>
        </div>
        <div className="overflow-clip relative shrink-0 size-[18px]" data-name="circle" />
      </div>
      <Frame15 />
      <Frame16 />
      <Frame18 />
      <div className="absolute h-[1024px] left-0 top-0 w-[255px]" data-name="Sidemenu">
        <div className="absolute bg-white inset-0" />
        <Group />
        <Frame14 />
      </div>
    </div>
  );
}