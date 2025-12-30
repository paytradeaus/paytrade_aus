import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  categoryListAndCount,
  getList,
} from "../Community/community.functions";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { format } from "date-fns";
import BlogPagination from "@/components/BlogPagination";
import { slugifyString } from "@/utils";
import { useParams, useRouter } from "next/navigation";
import { list } from "./discussion.constant";
import BreadCrumbs from "@/components/BreadCrumbs";
import { useTokenDetails } from "@/hooks";
import { useAppDispatch } from "@/redux/store";
import { setBlogDetailsForRouting } from "@/redux/slices/dashboardSlices";

export default function Discussion() {
  const params = useParams();
  const pageData = list[params?.discussion as keyof typeof list];
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Latest");
  const [category, setCategory] = useState<any>([]);
  const [listData, setListData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loader, setLoader] = useState(false);
  const { decodeTokenData }: any = useTokenDetails();

  const [categoryListAndCountData, setCategoryListAndCountData] = useState([]);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  useEffect(() => {
    const categoryList = async () => {
      const response = await categoryListAndCount({
        contentType: pageData.cmtyContentType,
      });
      const modData = response.categories
        .filter((val: any) => val.per_category_count > 0)
        .map((val: any) => {
          return {
            value: val.master_value,
            id: val.master_id,
            count: val.per_category_count,
            slug: slugifyString(val.master_value),
          };
        });
      modData.unshift({
        value: "All",
        id: 1,
        count: response.total_count,
        slug: "",
      });
      setCategoryListAndCountData(modData);
      if (params?.category && modData.length) {
        const categoryObj = modData.find(
          (val: any) => val.slug == params?.category
        );
        setCategory(categoryObj);
        getListData(categoryObj?.value);
      } else {
        getListData();
      }
    };
    if (category.length == 0) {
      categoryList();
    } else {
      getListData();
    }
  }, [search, sortBy, page]);

  function getListData(value?: string) {
    setLoader(true);
    getList({
      listDiscussionIdeasInput: {
        keyword: search,
        page: page,
        perPage: 10,
        category: value || category?.value || null,
        cmtyContentType: pageData.cmtyContentType,
        sort_mode: sortBy,
      },
    }).then((res) => {
      setListData(res?.discussionIdeas || []);
      setTotalCount(res?.totalCount);
      setLoader(false);
    });
  }

  const handleCommunitySearch = (searchText: string) => {
    setSearch(searchText);
  };

  const navToLoginPageDiscussionAndProductIdea = (
    from: "discussion" | "productIdea"
  ) => {
    const routes: Record<string, string> = {
      discussion: AppRoutes.COMMUNITY_START_DISCUSSION,
      productIdea: AppRoutes.CREATE_PRODUCT_IDEAS,
    };

    const targetRoute = routes[from];
    if (!targetRoute) return;

    if (decodeTokenData) {
      return router.push(targetRoute);
    }

    dispatch(setBlogDetailsForRouting({ url: targetRoute }));
    return router.push(AppRoutes.USER_LOGIN);
  };

  return (
    <main>
      <div className="pt_titletop">
        <div className="container-fluid">
          <div className="pt_breadcrumbs">
            {params?.category ? (
              <BreadCrumbs
                routePaths={[
                  {
                    name: "Community",
                    path: AppRoutes.COMMUNITY,
                  },
                  {
                    name: pageData?.pageName,
                    path: AppRoutes.COMMUNITY + "/" + pageData?.pageLink,
                  },
                ]}
                activeRoute={category?.value}
              />
            ) : (
              <>
                <BreadCrumbs
                  routePaths={[
                    {
                      name: "Community",
                      path: AppRoutes.COMMUNITY,
                    },
                  ]}
                  activeRoute={pageData.pageName}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pt_blog">
        <div className="container-fluid">
          <div className="bloggrid">
            <div className="pt_blogleft">
              <br />
              <a>
                <button
                  className="commentbutton"
                  onClick={() =>
                    navToLoginPageDiscussionAndProductIdea(
                      pageData?.pageName == "Discussions"
                        ? "discussion"
                        : "productIdea"
                    )
                  }
                >
                  <i className="fa-light fa-message-dots"></i>
                  {pageData?.startLinkText}
                </button>
              </a>
              <br />
              <br />

              <div className="pt_sidesearch">
                <form role="search">
                  <FormikControl
                    control={InputType.SEARCH}
                    onChange={handleCommunitySearch}
                    name={"communitySearch"}
                    placeholder="Search"
                  />
                </form>
              </div>

              <details open>
                <summary>
                  <i className="fa-light fa-sliders"></i>&nbsp;&nbsp;Filters
                </summary>

                <div className="pt_sidefilter">
                  <h6>Sort by</h6>
                  <select
                    name="favorite-cuisine"
                    aria-label="Select your favorite cuisine..."
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="Latest" key={"1"}>
                      Latest
                    </option>
                    <option value="Oldest" key={"2"}>
                      Oldest
                    </option>
                  </select>
                </div>
                <div className="pt_sidecategories">
                  {categoryListAndCountData?.length > 0 && <h6>Categories</h6>}
                  <ul>
                    {categoryListAndCountData?.map((val: any) => {
                      return (
                        <li key={val.id}>
                          {val.value == "All" ? (
                            <Link href={`/community/${pageData.pageLink}`}>
                              {val.value}
                              <span>{val.count}</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/community/${
                                pageData.pageLink
                              }/${slugifyString(val.value)}`}
                            >
                              {val.value}
                              <span>{val.count}</span>
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            </div>

            <div className="pt_blogright">
              <div className="pt_bloginner">
                <div className="container-fluid">
                  <h6>Community</h6>
                  <h3>{pageData?.pageName}</h3>

                  <div className="pt_box_transparent">
                    <div className="left pt_topiclist">
                      <h4>{params?.category ? category?.value : "All"}</h4>
                      {listData?.map((val: any) => {
                        return (
                          <div className="pt_topic" key={val.id}>
                            <div className="grid">
                              <div>
                                <span>{val?.category?.value}</span>
                                <Link
                                  href={`/community/${
                                    pageData?.pageLink
                                  }/${slugifyString(
                                    val?.category?.value || "All"
                                  )}/${slugifyString(val?.title)}/${val?.id}`}
                                >
                                  <h5>{val.title}</h5>
                                </Link>
                              </div>
                              <div className="pt_topicdata">
                                <div className="pt_topicstat">
                                  {val?.answer_comment_count || 0}
                                  <span>
                                    {!val?.answer_comment_count
                                      ? "Reply"
                                      : val?.answer_comment_count > 1
                                      ? "Replies"
                                      : "Reply"}
                                  </span>
                                </div>
                                <div className="pt_topicstat">
                                  {val?.view_count || 0}
                                  <span>
                                    {!val?.view_count
                                      ? "View"
                                      : val?.view_count > 1
                                      ? "Views"
                                      : "View"}
                                  </span>
                                </div>
                                <div className="pt_topicstat">
                                  {pageData?.pageName == "Discussions" ? (
                                    <i className="fa-light fa-thumbs-up"></i>
                                  ) : (
                                    <i className="fa-light fa-arrow-up-from-arc"></i>
                                  )}
                                  &nbsp;&nbsp;
                                  {val?.[pageData?.displayVoteKey] || 0}
                                  <span>
                                    {!val?.[pageData?.displayVoteKey]
                                      ? pageData?.displayVote
                                      : val?.[pageData?.displayVoteKey] > 1
                                      ? pageData?.displayVotes
                                      : pageData?.displayVote}
                                  </span>
                                </div>
                                <div className="pt_topicstat">
                                  {format(
                                    new Date(val?.created_on),
                                    "dd/MM/yyyy"
                                  )}
                                  <span>Date posted</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {totalCount > 10 && (
                        <BlogPagination
                          totalRecords={totalCount}
                          currentPage={page}
                          pageSize={10}
                          onPageChange={(page: number) => setPage(page)}
                        />
                      )}
                    </div>
                    {!loader &&
                      listData?.length == 0 &&
                      search?.length >= 4 && (
                        <p>No results match your search.</p>
                      )}
                  </div>

                  <div className="pt_links">
                    <div className="pt_linksinner">
                      <div className="container-fluid">
                        <br />
                        <br />
                        <div className="center">
                          <h3>Still have questions?</h3>
                          <p>
                            We're here to help! Get in touch with our support
                            team
                          </p>
                        </div>
                        <div className="grid">
                          <Link
                            href={AppRoutes.SUPPORT}
                            className="pt_linksbox"
                          >
                            <lottie-player
                              autoplay
                              loop
                              mode="normal"
                              src="/json/rbicons/supportrequest.json"
                            ></lottie-player>
                            <h4 className="oceantext">Contact support</h4>
                            <p>
                              Get help with your PayTrade account and products
                            </p>
                          </Link>
                          <a
                            onClick={() =>
                              navToLoginPageDiscussionAndProductIdea(
                                "discussion"
                              )
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
                              Ask questions and share your knowledge with other
                              PayTrade users
                            </p>
                          </a>
                          <a
                            onClick={() =>
                              navToLoginPageDiscussionAndProductIdea(
                                "productIdea"
                              )
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
                            <p>
                              Suggest new products and features to be added to
                              PayTrade
                            </p>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
