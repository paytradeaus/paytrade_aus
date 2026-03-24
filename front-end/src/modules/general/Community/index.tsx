import FormikControl from "@/components/FormikControl";
import { useTokenDetails } from "@/hooks";
import { setBlogDetailsForRouting } from "@/redux/slices/dashboardSlices";
import { useAppDispatch } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType } from "@/shared/constant/general";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState } from "react";
import { getTopData, searchCommunity } from "./community.functions";
import ShowMoreLess from "@/components/MoreLessCard";
import BlogPagination from "@/components/BlogPagination";
import { slugifyString, stripHtml } from "@/utils";
import { set } from "lodash";
import { format } from "date-fns";
import DOMPurify from "dompurify";

export default function Community() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { decodeTokenData }: any = useTokenDetails();
  const [searchedCommunity, setSearchedCommunity] = useState<any>("");
  const [searchedCommunityData, setSearchedCommunityData] = useState<any>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loader, setLoader]: any = useState(false);
  const [topDiscussion, setTopDiscussion]: any = useState([]);
  const [topProductIdeas, setTopProductIdeas]: any = useState([]);
  const [topLatestUnansweredQuestions, setTopLatestUnansweredQuestions]: any =
    useState([]);

  const [noDataMessage, setNoDataMessage] = useState("");

  useEffect(() => {
    import("@lottiefiles/lottie-player");
  }, []);

  useEffect(() => {
    getTopCards();
  }, []);

  async function getTopCards() {
    getTopData({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        cmtyContentType: "Discussion",
      },
    }).then((res) => setTopDiscussion(res?.discussionIdeas || []));
    getTopData({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        cmtyContentType: "Idea",
      },
    }).then((res) => setTopProductIdeas(res?.discussionIdeas || []));
    getTopData({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        is_answered: false,
        cmtyContentType: "Discussion",
      },
    }).then((res) =>
      setTopLatestUnansweredQuestions(res?.discussionIdeas || [])
    );
  }

  useEffect(() => {
    dispatch(setBlogDetailsForRouting({}));
  }, []);

  const navToLoginPageDiscussionAndProductIdea = (
    from: "discussion" | "productIdea" | "community"
  ) => {
    const routes: Record<string, string> = {
      discussion: AppRoutes.COMMUNITY_START_DISCUSSION,
      productIdea: AppRoutes.CREATE_PRODUCT_IDEAS,
      community: AppRoutes.COMMUNITY,
    };

    const targetRoute = routes[from];
    if (!targetRoute) return;

    if (decodeTokenData) {
      return router.push(targetRoute);
    }

    dispatch(setBlogDetailsForRouting({ url: targetRoute }));
    return router.push(AppRoutes.USER_LOGIN);
  };

  useEffect(() => {
    handleCommunitySearch(searchedCommunity);
  }, [page]);

  async function handleCommunitySearch(searchedValue: string) {
    if (searchedValue.length < 2) {
      setSearchedCommunityData([]);
      setSearchedCommunity("");
    } else {
      setSearchedCommunity(searchedValue);
      try {
        setLoader(true);
        const communitySearchData = await searchCommunity({
          listDiscussionIdeasInput: {
            perPage: 10,
            page,
            keyword: searchedValue,
          },
        });
        setSearchedCommunityData(communitySearchData?.discussionIdeas || []);
        setTotalCount(communitySearchData?.totalCount);
        setLoader(false);
      } catch (error) {
        setLoader(false);
        setSearchedCommunity("");
      }
    }
  }

  return (
    <>
      <div className="pt_titletop">
        <div className="container-fluid">
          <div className="center">
            <h1>Community</h1>
            <h5>Learn how to use PayTrade and get help from our community</h5>
            {!decodeTokenData && (
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("community")
                }
                className="cta"
              >
                <button>
                  Sign up to join our community
                  <i className="fa-light fa-arrow-right right"></i>
                </button>
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="pt_centered pt_pricing">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent">
            <div className="center">
              <h3 className="oceantext">Search our community</h3>
              <form role="search">
                <FormikControl
                  control={InputType.SEARCH}
                  onChange={handleCommunitySearch}
                  name={"communitySearch"}
                  placeholder="Search"
                  showSearchButton={true}
                  preventClick={true}
                />
              </form>
              <div style={{ marginTop: "0.75rem" }}>
                <Link href="/support" style={{ textDecoration: "none" }}>
                  <button className="secondary outline" style={{ fontSize: "0.9rem" }}>
                    <i className="fa-light fa-robot" style={{ marginRight: "0.4rem" }}></i>
                    Ask PayTrade AI
                  </button>
                </Link>
              </div>
            </div>

            <div className="left">
              {searchedCommunityData?.length > 0 && <h4>Search results</h4>}
              {searchedCommunityData?.map((val: any) => (
                <ShowMoreLess
                  text={val.content}
                  title={val.title}
                  link={
                    "/community/" +
                    (val.cmty_content_type == "Discussion"
                      ? "discussions"
                      : "product-ideas") +
                    "/" +
                    slugifyString(val?.category?.value || "All") +
                    "/" +
                    slugifyString(val?.title) +
                    "/" +
                    val.id
                  }
                  maxLength={200}
                  key={val.id}
                ></ShowMoreLess>
              ))}
              {totalCount > 4 && (
                <BlogPagination
                  currentPage={page}
                  totalRecords={totalCount}
                  pageSize={4}
                  onPageChange={(page: number) => setPage(page)}
                ></BlogPagination>
              )}
              {!loader &&
                searchedCommunityData?.length == 0 &&
                searchedCommunity?.length >= 2 && (
                  <p>No results match your search.</p>
                )}
              {loader && <p>searching records...</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="pt_links">
        <div className="pt_linksinner">
          <div className="container-fluid">
            <div className="grid">
              <a
                className="pt_linksbox cu-pointer"
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("discussion")
                }
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/users.json"
                ></lottie-player>
                <h4 className="oceantext">Start discussion</h4>
                <p>
                  Ask questions and share your knowledge with other PayTrade
                  users
                </p>
              </a>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("productIdea")
                }
                className="pt_linksbox cu-pointer"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/ideas.json"
                ></lottie-player>
                <h4 className="oceantext">Create product idea</h4>
                <p>Suggest new products and features to be added to PayTrade</p>
              </a>
            </div>
          </div>
        </div>
      </div>
      {topDiscussion?.length > 0 && (
        <div className="pt_highlights">
          <div className="pt_highlightsinner">
            <div className="container-fluid">
              <div className="center">
                <h3>Top discussions</h3>
                <p>Find out what other PayTrade users are talking about</p>
              </div>
              <div className="grid">
                {topDiscussion?.map((val: any) => (
                  <div
                    className="pt_highlightbox pt_discussionbox cu-pointer"
                    key={val.id}
                    onClick={() => {
                      router.push(
                        `/community/discussions/${slugifyString(
                          val?.category?.value
                        )}/${slugifyString(val.title)}/${val.id}`
                      );
                    }}
                  >
                    <div className="pt_iconheading">
                      <i className="fa-light fa-comments"></i> Discussion
                    </div>
                    <h6>{format(val.created_on, "d MMMM yyyy")}</h6>
                    <a>
                      <h4>{val.title}</h4>
                    </a>
                    <p
                      style={{
                        height: "180px",
                        overflow: "hidden",
                      }}
                    >
                      {stripHtml(val.content).length > 280
                        ? stripHtml(val.content).slice(0, 280) + "..."
                        : stripHtml(val.content)}
                    </p>
                    <div className="pt_iconstatus pt_green">
                      <i className="fa-light fa-circle-check"></i> Answered
                    </div>
                  </div>
                ))}
              </div>
              <div className="center">
                <Link href="/community/discussions">
                  <button className="contrast">
                    View all discussions
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      {topLatestUnansweredQuestions?.length > 0 && (
        <div className="pt_highlights">
          <div className="pt_highlightsinner">
            <div className="container-fluid">
              <div className="center">
                <h3>Latest unanswered questions</h3>
                <p>Help other paytrade users by answering their questions</p>
              </div>
              <div className="grid">
                {topLatestUnansweredQuestions?.map((val: any) => (
                  <div
                    className="pt_highlightbox pt_discussionbox cu-pointer"
                    key={val.id}
                    onClick={() => {
                      router.push(
                        `/community/discussions/${slugifyString(
                          val?.category?.value
                        )}/${slugifyString(val.title)}/${val.id}`
                      );
                    }}
                  >
                    <div className="pt_iconheading">
                      <i className="fa-light fa-comments"></i> Discussion
                    </div>
                    <h6>{format(val.created_on, "d MMMM yyyy")}</h6>
                    <a>
                      <h4>{val.title}</h4>
                    </a>
                    <p>
                      {stripHtml(val.content).length > 280
                        ? stripHtml(val.content).slice(0, 280) + "..."
                        : stripHtml(val.content)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="center">
                <Link href="/community/discussions">
                  <button className="contrast">
                    View all discussions
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      {topProductIdeas?.length > 0 && (
        <div className="pt_highlights">
          <div className="pt_highlightsinner">
            <div className="container-fluid">
              <div className="center">
                <h3>Top product ideas</h3>
                <p>
                  Discover the most popular product ideas from the community.
                </p>
              </div>
              <div className="grid">
                {topProductIdeas?.map((val: any) => (
                  <div
                    className="pt_highlightbox pt_discussionbox cu-pointer"
                    key={val.id}
                    onClick={() => {
                      router.push(
                        `/community/discussions/${slugifyString(
                          val?.category?.value || "All"
                        )}/${slugifyString(val.title)}/${val.id}`
                      );
                    }}
                  >
                    <div className="pt_iconheading">
                      <i className="fa-light fa-lightbulb-on"></i> Product idea
                    </div>
                    <h6>{format(val.created_on, "d MMMM yyyy")}</h6>
                    <a>
                      <h4>{val?.title}</h4>
                    </a>
                    <p>
                      {stripHtml(val.content).length > 280
                        ? stripHtml(val.content).slice(0, 280) + "..."
                        : stripHtml(val.content)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="center">
                <Link href="/community/product-ideas">
                  <button className="contrast">
                    View all product ideas
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt_links">
        <div className="pt_linksinner">
          <div className="container-fluid">
            <br />
            <div className="center">
              <h3>Still have questions?</h3>
              <p>We're here to help! Get in touch with our support team</p>
            </div>
            <div className="grid">
              <Link href={AppRoutes.SUPPORT} className="pt_linksbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/supportrequest.json"
                ></lottie-player>
                <h4 className="oceantext">Contact support</h4>
                <p>Get help with your PayTrade account and products</p>
              </Link>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("discussion")
                }
                className="pt_linksbox cu-pointer"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/users.json"
                ></lottie-player>
                <h4 className="oceantext">Start discussion</h4>
                <p>
                  Ask questions and share your knowledge with other PayTrade
                  users
                </p>
              </a>
              <a
                onClick={() =>
                  navToLoginPageDiscussionAndProductIdea("productIdea")
                }
                className="pt_linksbox cu-pointer"
              >
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/ideas.json"
                ></lottie-player>
                <h4 className="oceantext">Create product idea</h4>
                <p>Suggest new products and features to be added to PayTrade</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
